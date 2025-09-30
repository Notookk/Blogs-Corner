import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPostSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import express from "express";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// SSE connections
const sseConnections = new Set<express.Response>();

function broadcastUpdate(type: string, data: any) {
  const message = `data: ${JSON.stringify({ type, data })}\n\n`;
  sseConnections.forEach(res => {
    try {
      res.write(message);
    } catch (error) {
      sseConnections.delete(res);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded images
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // SSE endpoint for real-time updates
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    sseConnections.add(res);

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    req.on('close', () => {
      sseConnections.delete(res);
    });
  });

  // Get all posts
  app.get('/api/posts', async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch posts' });
    }
  });

  // Get single post
  app.get('/api/posts/:id', async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch post' });
    }
  });

  // Create new post
  app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
      let imageUrl = null;
      let imageFileName = null;

      // Handle image upload
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        imageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
        imageUrl = await storage.saveImage(req.file.buffer, imageFileName);
      }

      const postData: any = {
        ...req.body,
        imageUrl,
        imageFileName,
      };

      // Convert published string to boolean if present
      if (postData.published !== undefined) {
        postData.published = postData.published === 'true' || postData.published === true;
      }

      const validatedData = insertPostSchema.parse(postData);
      const post = await storage.createPost(validatedData);
      
      // Broadcast update to SSE connections
      broadcastUpdate('post_created', post);
      
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid post data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create post' });
    }
  });

  // Update post
  app.put('/api/posts/:id', upload.single('image'), async (req, res) => {
    try {
      // Get the existing post first to access old image
      const existingPost = await storage.getPost(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ message: 'Post not found' });
      }

      let updateData: any = { ...req.body };

      // Convert published string to boolean if present
      if (updateData.published !== undefined) {
        updateData.published = updateData.published === 'true' || updateData.published === true;
      }

      // Handle new image upload
      if (req.file) {
        // Delete old image if exists
        if (existingPost.imageFileName) {
          await storage.deleteImage(existingPost.imageFileName);
        }

        const fileExtension = path.extname(req.file.originalname);
        const imageFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
        const imageUrl = await storage.saveImage(req.file.buffer, imageFileName);
        
        updateData = {
          ...updateData,
          imageUrl,
          imageFileName,
        };
      }

      // Validate the update data
      const updateSchema = insertPostSchema.partial();
      const validatedData = updateSchema.parse(updateData);

      const post = await storage.updatePost(req.params.id, validatedData);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Broadcast update to SSE connections
      broadcastUpdate('post_updated', post);
      
      res.json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid update data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update post' });
    }
  });

  // Delete post
  app.delete('/api/posts/:id', async (req, res) => {
    try {
      const deleted = await storage.deletePost(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Broadcast update to SSE connections
      broadcastUpdate('post_deleted', { id: req.params.id });
      
      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete post' });
    }
  });

  // Increment post views
  app.post('/api/posts/:id/view', async (req, res) => {
    try {
      await storage.incrementViews(req.params.id);
      res.json({ message: 'View count updated' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update view count' });
    }
  });

  // Toggle post like
  app.post('/api/posts/:id/like', async (req, res) => {
    try {
      const post = await storage.toggleLike(req.params.id);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Broadcast update to SSE connections
      broadcastUpdate('post_liked', post);
      
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update like count' });
    }
  });

  // Get blog statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const posts = await storage.getPosts();
      const totalPosts = posts.length;
      const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
      const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);

      res.json({
        totalPosts,
        totalViews,
        totalLikes,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch statistics' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
