import { type Post, type InsertPost } from "@shared/schema";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

export interface IStorage {
  getPosts(): Promise<Post[]>;
  getPost(id: string): Promise<Post | undefined>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;
  incrementViews(id: string): Promise<void>;
  toggleLike(id: string): Promise<Post | undefined>;
  saveImage(buffer: Buffer, filename: string): Promise<string>;
  deleteImage(filename: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private posts: Map<string, Post>;
  private uploadsDir: string;

  constructor() {
    this.posts = new Map();
    this.uploadsDir = path.join(process.cwd(), "uploads");
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async getPosts(): Promise<Post[]> {
    return Array.from(this.posts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async createPost(insertPost: InsertPost): Promise<Post> {
    const id = randomUUID();
    const now = new Date();
    const post: Post = {
      ...insertPost,
      id,
      imageUrl: insertPost.imageUrl ?? null,
      imageFileName: insertPost.imageFileName ?? null,
      published: insertPost.published ?? true,
      views: 0,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.set(id, post);
    return post;
  }

  async updatePost(id: string, updateData: Partial<InsertPost>): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    const updatedPost: Post = {
      ...post,
      ...updateData,
      updatedAt: new Date(),
    };
    
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: string): Promise<boolean> {
    const post = this.posts.get(id);
    if (!post) return false;

    // Delete associated image if exists
    if (post.imageFileName) {
      await this.deleteImage(post.imageFileName);
    }

    return this.posts.delete(id);
  }

  async incrementViews(id: string): Promise<void> {
    const post = this.posts.get(id);
    if (post) {
      post.views += 1;
      post.updatedAt = new Date();
      this.posts.set(id, post);
    }
  }

  async toggleLike(id: string): Promise<Post | undefined> {
    const post = this.posts.get(id);
    if (!post) return undefined;

    post.likes += 1;
    post.updatedAt = new Date();
    this.posts.set(id, post);
    return post;
  }

  async saveImage(buffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  }

  async deleteImage(filename: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, filename);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
      console.log(`Could not delete image: ${filename}`);
    }
  }
}

export const storage = new MemStorage();
