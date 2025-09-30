import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Search,
  Eye,
  Heart,
  Calendar,
  User,
  Users,
  FileText,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSSE } from '@/hooks/use-sse';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Post } from '@shared/schema';

export default function PublicBlog() {
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

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('POST', `/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to like post',
        variant: 'destructive',
      });
    },
  });

  const viewMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('POST', `/api/posts/${postId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
  });

  const handleLike = (postId: string) => {
    likeMutation.mutate(postId);
  };

  const handleView = (postId: string) => {
    viewMutation.mutate(postId);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readingTime} min read`;
  };

  const publishedPosts = posts?.filter(post => post.published) || [];
  const featuredPost = publishedPosts[0];
  const regularPosts = publishedPosts.slice(1);

  const categoryColors: Record<string, string> = {
    Technology: 'bg-primary/10 text-primary',
    Design: 'bg-accent/10 text-accent',
    Photography: 'bg-blue-100 text-blue-700',
    Travel: 'bg-purple-100 text-purple-700',
    Lifestyle: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-primary">BulBul Corner</h1>
              <span className="hidden sm:block text-muted-foreground">|</span>
              <span className="hidden sm:block text-muted-foreground">Thoughts & Stories</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" data-testid="button-search">
                <Search className="h-4 w-4" />
              </Button>
              <Link href="/admin">
                <Button variant="default" size="sm" data-testid="button-admin">
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 to-accent/5 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Welcome to BulBul Corner</h2>
          <p className="text-xl text-muted-foreground mb-8">Discover stories, insights, and ideas that matter</p>
          <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
            <span className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span data-testid="text-hero-articles">
                {statsLoading ? '...' : `${stats?.totalPosts || 0} Articles`}
              </span>
            </span>
            <span className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span data-testid="text-hero-readers">1.2k Readers</span>
            </span>
            <span className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span data-testid="text-hero-likes">
                {statsLoading ? '...' : `${stats?.totalLikes || 0} Likes`}
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {postsLoading ? (
              <>
                {/* Featured Post Skeleton */}
                <Card className="overflow-hidden">
                  <Skeleton className="w-full h-64" />
                  <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </Card>
                {/* Regular Posts Skeletons */}
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <Skeleton className="w-24 h-16 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-16 w-full" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            ) : publishedPosts.length > 0 ? (
              <>
                {/* Featured Post */}
                {featuredPost && (
                  <Card 
                    className="overflow-hidden hover-lift cursor-pointer"
                    onClick={() => handleView(featuredPost.id)}
                    data-testid={`featured-post-${featuredPost.id}`}
                  >
                    {featuredPost.imageUrl && (
                      <img
                        src={featuredPost.imageUrl}
                        alt={featuredPost.title}
                        className="w-full h-64 object-cover"
                      />
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2 mb-3">
                        <Badge className="bg-primary/10 text-primary">Featured</Badge>
                        <span className="text-sm text-muted-foreground">
                          {getReadingTime(featuredPost.content)}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-foreground mb-3" data-testid={`text-featured-title-${featuredPost.id}`}>
                        {featuredPost.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {featuredPost.content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{formatTimeAgo(featuredPost.createdAt)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span data-testid={`text-featured-views-${featuredPost.id}`}>{featuredPost.views}</span>
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(featuredPost.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          data-testid={`button-like-featured-${featuredPost.id}`}
                        >
                          <Heart className="h-4 w-4 mr-1" />
                          <span data-testid={`text-featured-likes-${featuredPost.id}`}>{featuredPost.likes}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Regular Posts */}
                {regularPosts.map((post) => (
                  <Card 
                    key={post.id} 
                    className="hover-lift cursor-pointer"
                    onClick={() => handleView(post.id)}
                    data-testid={`post-${post.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt={post.title}
                            className="w-24 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge className={categoryColors[post.category] || 'bg-gray-100 text-gray-700'}>
                              {post.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {getReadingTime(post.content)}
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-foreground mb-2" data-testid={`text-post-title-${post.id}`}>
                            {post.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-3">
                            {post.content.substring(0, 150)}...
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatTimeAgo(post.createdAt)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Eye className="h-4 w-4" />
                                <span data-testid={`text-post-views-${post.id}`}>{post.views}</span>
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLike(post.id);
                              }}
                              className="text-muted-foreground hover:text-destructive"
                              data-testid={`button-like-post-${post.id}`}
                            >
                              <Heart className="h-4 w-4 mr-1" />
                              <span data-testid={`text-post-likes-${post.id}`}>{post.likes}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No posts available</h3>
                <p className="text-muted-foreground">Check back later for new content!</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            {/* About Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">About BulBul Corner</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  A space for sharing thoughts, experiences, and insights on technology, creativity, and life.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Articles</span>
                    <span className="font-medium text-foreground" data-testid="text-sidebar-articles">
                      {statsLoading ? '...' : stats?.totalPosts || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Views</span>
                    <span className="font-medium text-foreground" data-testid="text-sidebar-views">
                      {statsLoading ? '...' : `${(stats?.totalViews || 0) / 1000}k`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Likes</span>
                    <span className="font-medium text-foreground" data-testid="text-sidebar-likes">
                      {statsLoading ? '...' : stats?.totalLikes || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Popular Tags */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/10 text-primary">Technology</Badge>
                  <Badge className="bg-accent/10 text-accent">Design</Badge>
                  <Badge className="bg-blue-100 text-blue-700">Photography</Badge>
                  <Badge className="bg-purple-100 text-purple-700">Travel</Badge>
                  <Badge className="bg-orange-100 text-orange-700">Lifestyle</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent rounded-full"></div>
                    <span className="text-muted-foreground">New post published</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">
                      {stats?.totalLikes || 0} new likes received
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-muted-foreground">Updated blog theme</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold text-primary">BulBul Corner</h3>
              <p className="text-sm text-muted-foreground">© 2024 All rights reserved</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <path d="m17.5 6.5h.01" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
