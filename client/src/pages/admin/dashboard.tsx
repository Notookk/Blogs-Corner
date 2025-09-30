import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Heart,
  Menu,
  User,
  ExternalLink,
  BarChart3,
  Images,
  FileText,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSSE } from '@/hooks/use-sse';
import { useToast } from '@/hooks/use-toast';
import { PostModal } from './components/post-modal';
import { DeleteModal } from './components/delete-modal';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Post } from '@shared/schema';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | undefined>(undefined);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Set up SSE connection for real-time updates
  useSSE();

  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts'],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
  }>({
    queryKey: ['/api/stats'],
  });

  const handleNewPost = () => {
    setSelectedPost(undefined);
    setPostModalOpen(true);
  };

  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setPostModalOpen(true);
  };

  const handleDeletePost = (post: Post) => {
    setSelectedPost(post);
    setDeleteModalOpen(true);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile Menu Toggle */}
      {isMobile && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`w-64 bg-card border-r border-border shadow-sm fixed lg:relative h-full z-40 transition-transform duration-300 ${
          isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary">BulBul Corner</h1>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>

        <nav className="p-4 space-y-2">
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
            <span>Posts</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer">
            <Images className="h-4 w-4" />
            <span>Media</span>
          </div>
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors cursor-pointer">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </div>
          <Link
            href="/blog"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-secondary-foreground transition-colors"
            data-testid="link-view-public"
          >
            <ExternalLink className="h-4 w-4" />
            <span>View Public</span>
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-secondary">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-foreground truncate">
                Admin User
              </p>
              <p className="text-xs text-muted-foreground">admin@bulbulcorner.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Posts Management</h2>
              <p className="text-muted-foreground">Create and manage your blog posts</p>
            </div>
            <Button onClick={handleNewPost} data-testid="button-new-post">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Posts</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-posts">
                        {stats?.totalPosts || 0}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-20 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-views">
                        {stats?.totalViews || 0}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Eye className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Likes</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-likes">
                        {stats?.totalLikes || 0}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                    <Heart className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Posts List */}
          <Card>
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Posts</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Real-time sync active</span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border">
              {postsLoading ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-6">
                      <div className="flex items-start space-x-4">
                        <Skeleton className="w-16 h-10 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : posts && posts.length > 0 ? (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-6 hover:bg-secondary/50 transition-colors"
                    data-testid={`post-item-${post.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {post.imageUrl && (
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="w-16 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <h4 className="font-medium text-foreground" data-testid={`text-post-title-${post.id}`}>
                              {post.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Published {formatTimeAgo(post.createdAt)}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {post.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span data-testid={`text-post-views-${post.id}`}>{post.views} views</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Heart className="h-4 w-4" />
                            <span data-testid={`text-post-likes-${post.id}`}>{post.likes} likes</span>
                          </span>
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs">
                            {post.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPost(post)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                          data-testid={`button-edit-post-${post.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePost(post)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-delete-post-${post.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first blog post to get started.
                  </p>
                  <Button onClick={handleNewPost} data-testid="button-create-first-post">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Post
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </main>
      </div>

      {/* Modals */}
      <PostModal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        post={selectedPost}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        post={selectedPost}
      />

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
