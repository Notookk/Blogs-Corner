import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Eye,
  Heart,
  Share,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSSE } from '@/hooks/use-sse';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Post } from '@shared/schema';

export default function PublicBlog() {
  const { toast } = useToast();
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [isViewing, setIsViewing] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState<string | null>(null);
  const viewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const postRefsMap = useRef<Map<string, HTMLElement>>(new Map());

  // Set up SSE connection for real-time updates
  useSSE();

  // Load liked and viewed posts from localStorage on mount
  useEffect(() => {
    const savedLikedPosts = localStorage.getItem('bulbul-liked-posts');
    const savedViewedPosts = localStorage.getItem('bulbul-viewed-posts');
    
    if (savedLikedPosts) {
      try {
        const likedArray = JSON.parse(savedLikedPosts);
        setLikedPosts(new Set(likedArray));
      } catch (error) {
        console.error('Failed to parse liked posts from localStorage:', error);
      }
    }
    
    if (savedViewedPosts) {
      try {
        const viewedArray = JSON.parse(savedViewedPosts);
        setViewedPosts(new Set(viewedArray));
      } catch (error) {
        console.error('Failed to parse viewed posts from localStorage:', error);
      }
    }
  }, []);

  // Save liked posts to localStorage whenever it changes
  useEffect(() => {
    if (likedPosts.size > 0) {
      localStorage.setItem('bulbul-liked-posts', JSON.stringify(Array.from(likedPosts)));
    }
  }, [likedPosts]);

  // Save viewed posts to localStorage whenever it changes
  useEffect(() => {
    if (viewedPosts.size > 0) {
      localStorage.setItem('bulbul-viewed-posts', JSON.stringify(Array.from(viewedPosts)));
    }
  }, [viewedPosts]);

  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ['/api/posts'],
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      await apiRequest('POST', `/api/posts/${postId}/like`);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setLikedPosts(prev => new Set(Array.from(prev).concat(postId)));
      setIsLiking(null);
      toast({
        title: 'Post liked! ❤️',
        description: 'Thank you for your support!',
      });
    },
    onError: (error, postId) => {
      setIsLiking(null);
      console.error('Failed to like post:', error);
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
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      setViewedPosts(prev => new Set(Array.from(prev).concat(postId)));
      setIsViewing(null);
      toast({
        title: 'Post viewed',
        description: 'View count updated!',
      });
    },
    onError: (error, postId) => {
      setIsViewing(null);
      console.error('Failed to update view count:', error);
      toast({
        title: 'Error',
        description: 'Failed to update view count',
        variant: 'destructive',
      });
    },
  });

  // Set up Intersection Observer for auto view tracking
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId && !viewedPosts.has(postId)) {
              // Post is 50% visible, start auto-view tracking
              handleAutoView(postId);
            }
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of post is visible
        rootMargin: '0px 0px -20% 0px' // Only count when well within viewport
      }
    );

    // Observe all post elements
    postRefsMap.current.forEach((element) => {
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [posts, viewedPosts]);

  const handleLike = (postId: string, postTitle: string) => {
    // Prevent multiple likes of the same post in this session
    if (likedPosts.has(postId)) {
      toast({
        title: 'Already liked! ❤️',
        description: 'You have already liked this post in this session',
        variant: 'destructive',
      });
      return;
    }

    // Prevent spamming likes
    if (isLiking === postId) {
      return;
    }

    setIsLiking(postId);

    // Show immediate feedback
    toast({
      title: 'Liking post... ❤️',
      description: `"${postTitle.substring(0, 40)}${postTitle.length > 40 ? '...' : ''}"`,
    });

    // Execute like with small delay for better UX
    setTimeout(() => {
      likeMutation.mutate(postId);
    }, 500);
  };

  const handleView = (postId: string, postTitle: string) => {
    // Prevent multiple views of the same post in this session
    if (viewedPosts.has(postId) || isViewing === postId) {
      return;
    }

    // Clear any existing timeout
    if (viewTimeoutRef.current) {
      clearTimeout(viewTimeoutRef.current);
    }

    setIsViewing(postId);

    // Debounce view tracking - wait 1 second before actually counting the view
    viewTimeoutRef.current = setTimeout(() => {
      viewMutation.mutate(postId);
    }, 1000);

    // Show immediate feedback
    toast({
      title: 'Reading post...',
      description: `"${postTitle.substring(0, 50)}${postTitle.length > 50 ? '...' : ''}"`,
    });
  };

  // Auto view tracking when post comes into view
  const handleAutoView = (postId: string) => {
    // Only auto-view if not already viewed in this session
    if (viewedPosts.has(postId) || isViewing === postId) {
      return;
    }

    setIsViewing(postId);
    
    // Auto-view with shorter delay
    setTimeout(() => {
      viewMutation.mutate(postId);
    }, 1500); // 1.5 seconds of viewing to count as a view
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this post!',
          text: 'I found this interesting post on BulBul Corner.',
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied!',
        description: 'Post link copied to clipboard',
      });
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const publishedPosts = posts?.filter(post => post.published) || [];

  // Logo z-index management and posts reveal
  useEffect(() => {
    const handleScroll = () => {
      const logo = document.querySelector('.logo') as HTMLElement;
      const postsSection = document.querySelector('.posts-section') as HTMLElement;
      const scrollPosition = window.pageYOffset;
      // Move logo behind posts when posts section is visible
      const postsTop = 50;
      if (logo && postsSection) {
        if (scrollPosition >= postsTop) {
          logo.style.setProperty('z-index', '0', 'important');
          logo.style.setProperty('opacity', '1', 'important');
        } else {
          logo.style.setProperty('z-index', '200', 'important');
          logo.style.setProperty('opacity', '1', 'important');
        }
      }
    };

    // Reveal posts only after logo animation finishes
    const logo = document.querySelector('.logo');
    const postsSection = document.querySelector('.posts-section');
    const showPosts = () => {
      if (postsSection && !postsSection.classList.contains('show')) {
        postsSection.classList.add('show');
      }
    };
    if (logo) {
      logo.addEventListener('animationend', showPosts, { once: true });
    }
    // Fallback in case animationend doesn't fire (e.g., reduced motion)
    const fallbackTimer = window.setTimeout(showPosts, 3200);

    // Run once on mount to set initial state, with delay to let animation finish
    setTimeout(() => {
      const logo = document.querySelector('.logo') as HTMLElement;
      if (logo) {
        // Set initial z-index after animation
        logo.style.setProperty('z-index', '200', 'important');
      }
      handleScroll();
  }, 3100); // Wait for logo animation to complete (3s + small buffer)
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (logo) logo.removeEventListener('animationend', showPosts as EventListener);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (viewTimeoutRef.current) {
        clearTimeout(viewTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <style>{`
        * {
          overflow-x: hidden;
        }
        
        html, body {
          overflow-x: hidden;
          width: 100%;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background-color: #0a0a0a; /* dark fallback when image not yet painted */
          background-image: url('/assets/blogs_back.jpg');
          background-position: center center;
          background-repeat: no-repeat;
          background-size: cover;
          background-attachment: fixed;
          color: #ffffff;
          line-height: 1.6;
          position: relative;
        }

        /* Avoid fixed attachment on small screens to sidestep iOS Safari issues */
        @media (max-width: 768px) {
          html, body { background-attachment: scroll; }
        }

        /* Add overlay for better text readability */
        html::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.7) 0%, rgba(118, 75, 162, 0.7) 100%);
          z-index: -2;
          pointer-events: none;
        }

        .posts-section {
          position: relative; /* create stacking context above background */
          z-index: 1000; /* higher than any logo behind state */
          opacity: 0;
          transform: translateY(24px);
        }
        .posts-section.show {
          animation: cardsEntrance 0.9s ease-out forwards;
        }

        @keyframes cardsEntrance {
          0% {
            opacity: 0;
            transform: translateY(50px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardSlideIn {
          0% {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Stagger per-card when posts reveal */
        .posts-section.show article { opacity: 0; transform: translateY(20px); animation: cardSlideIn 0.6s ease-out forwards; }
        .posts-section.show article:nth-child(1) { animation-delay: 0.05s; }
        .posts-section.show article:nth-child(2) { animation-delay: 0.10s; }
        .posts-section.show article:nth-child(3) { animation-delay: 0.15s; }
        .posts-section.show article:nth-child(4) { animation-delay: 0.20s; }
        .posts-section.show article:nth-child(5) { animation-delay: 0.25s; }
        .posts-section.show article:nth-child(6) { animation-delay: 0.30s; }
        .posts-section.show article:nth-child(7) { animation-delay: 0.35s; }
        .posts-section.show article:nth-child(8) { animation-delay: 0.40s; }

        .glass-card {
          background: rgba(255, 255, 255, 0.48);
          /* Disable dynamic backdrop blur to keep frost constant on scroll */
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 20px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden; /* clip pseudo-element blur to rounded corners */
          z-index: 100 !important;
          isolation: isolate; /* stable compositing */
          will-change: transform;
        }

        /* Fallback blur for environments where backdrop-filter is disabled (e.g., some GPUs or DevTools states) */
        .glass-card::before {
          content: '';
          position: absolute;
          inset: -200px; /* extend more to avoid edge blur cut-off at extreme blur */
          /* Avoid background-attachment: fixed due to mobile quirks */
          background: url('/assets/blogs_back.jpg') center center / cover no-repeat;
          filter: blur(6000px);
          opacity: 1;
          z-index: 0; /* visible below overlay and content */
          border-radius: inherit;
          pointer-events: none;
          /* Keep fallback blur stable relative to viewport to prevent apparent blur reduction */
          background-position: center calc(50% + 60px);
        }

        /* On desktop, lock fallback blur to viewport for rock-solid frosted effect */
        @media (min-width: 769px) {
          .glass-card::before {
            background-attachment: fixed;
          }
        }

        /* Subtle glass film above the blurred layer for stronger frosted look */
        .glass-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(1200px 600px at -10% -10%, rgba(255,255,255,0.62), transparent 60%),
            radial-gradient(800px 400px at 110% 0%, rgba(255,255,255,0.50), transparent 55%),
            linear-gradient(0deg, rgba(185,210,255,0.34), rgba(185,210,255,0.34));
          z-index: 1; /* sits above ::before, below content */
          pointer-events: none;
          border-radius: inherit;
        }

        /* Ensure all content sits above pseudo-elements */
        .glass-card > * { position: relative; z-index: 2; }
        

        /* Mobile tuning: stronger blur + friendlier layout */
        @media (max-width: 768px) {
          .glass-card {
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            background: rgba(255, 255, 255, 0.54);
          }
          .glass-card::before {
            filter: blur(8000px);
            opacity: 1;
            /* background already non-fixed for mobile */
            /* emulate fixed by keeping position stable */
            background-position: center 50%;
          }
          .glass-card::after {
            background:
              radial-gradient(1000px 500px at -10% -10%, rgba(255,255,255,0.68), transparent 60%),
              radial-gradient(700px 350px at 110% 0%, rgba(255,255,255,0.58), transparent 55%),
              linear-gradient(0deg, rgba(185,210,255,0.40), rgba(185,210,255,0.40));
          }
          /* Softer hover on small screens to avoid cropping */
          .glass-card:hover {
            transform: translateY(-4px) scale(1.01);
          }
        }

        /* Status badges layout and style */
        .status-badges {
          position: absolute;
          top: 0.75rem; /* ~top-3 */
          right: 0.75rem; /* ~right-3 */
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          z-index: 3; /* above card content */
          pointer-events: none; /* informative only */
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.70rem; /* slightly smaller */
          line-height: 1;
          font-weight: 700;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.25);
          white-space: nowrap;
        }
        .status-badge .icon { width: 0.75rem; height: 0.75rem; }

        .glass-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 25px 50px rgba(0, 0, 0, 0.4);
          background: rgba(255, 255, 255, 0.20);
          border-color: rgba(255, 255, 255, 0.45);
        }

        .logo {
          position: fixed;
          top: -140px;
          left: 50%;
          transform: translateX(-50%);
          width: 360px;
          height: 480px;
          opacity: 0;
          pointer-events: none; /* ensure clicks go to cards */
          animation: logoEntrance 3s ease-in-out forwards;
          transition: opacity 0.5s ease-in-out, z-index 0.1s ease-in-out;
        }

        @keyframes logoEntrance {
          0% {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(3);
            opacity: 1;
            filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.8));
          }
          30% {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(3);
            opacity: 1;
            filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.8));
          }
          70% {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 1;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
          }
          100% {
            position: fixed;
            top: -140px;
            left: 50%;
            transform: translateX(-50%) scale(1);
            opacity: 1;
            filter: none;
          }
        }

        .parallax-bg {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          background: url('/assets/blogs_back.jpg') center center / cover no-repeat;
          /* Lock background to avoid any perceived blur shift during scroll */
          background-attachment: fixed;
          background-color: #0a0a0a; /* fallback fill */
          will-change: opacity;
          background-position: center 50%;
        }

        /* Add animated overlay for dynamic effect */
        .parallax-bg::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(30, 60, 114, 0.6) 0%, rgba(42, 82, 152, 0.6) 50%, rgba(102, 126, 234, 0.6) 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .main-container {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .post-content h1, .post-content h2, .post-content h3 { 
          font-weight: 900; 
          margin-top: 1.5rem; 
          margin-bottom: 0.5rem;
          color: #0b0b0b;
        }
        .post-content h1 { 
          font-size: 2.25rem; 
          color: #0b0b0b;
        }
        .post-content h2 { font-size: 1.85rem; color: #0b0b0b; font-weight: 900; letter-spacing: 0.2px; }
        .post-content h3 { font-size: 1.55rem; color: #0b0b0b; font-weight: 900; letter-spacing: 0.2px; }
        .post-content p { 
          margin-bottom: 1.2rem; 
          line-height: 1.85; 
          color: #0b0b0b;
          font-size: 1.12rem;
          font-weight: 900;
        }
        .post-content strong { 
          font-weight: 900; 
          color: #0b0b0b;
        }
        .post-content em { 
          font-style: italic; 
          color: #0b0b0b;
          font-weight: 800;
        }
        .post-content ul { 
          list-style-type: disc; 
          margin-left: 1.5rem; 
          margin-bottom: 1rem; 
          color: #0b0b0b;
          font-weight: 800;
        }
        .post-content ol { 
          list-style-type: decimal; 
          margin-left: 1.5rem; 
          margin-bottom: 1rem; 
          color: #0b0b0b;
          font-weight: 800;
        }
        .post-content a { 
          color: #0b0b0b; 
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          font-weight: 800;
        }
        .post-content a:hover {
          color: #000000;
          border-bottom-color: #000000;
        }

        ::-webkit-scrollbar {
          width: 12px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a6fd8, #6a4190);
        }

        @media (max-width: 768px) {
          .logo {
            width: 360px;
            height: 480px;
          }
          
          @keyframes logoEntrance {
            0% {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(2.5);
              opacity: 1;
              z-index: 2000;
              filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.8));
            }
            30% {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(2.5);
              opacity: 1;
              filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.8));
            }
            70% {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
              filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
            }
            100% {
              position: fixed;
              top: -140px;
              left: 50%;
              transform: translateX(-50%) scale(1);
              opacity: 1;
              filter: none;
            }
          }
        }

        @media (max-width: 480px) {
          .logo {
            width: 360px;
            height: 480px;
          }
        }
      `}</style>
      <div className="main-container min-h-screen" style={{ color: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
        {/* Parallax Background */}
        <div className="parallax-bg" />
        
        {/* Logo with Animation */}
        <img 
          className="logo"
          src="/assets/bulbul_blogs.jpg"
          alt="BulBul Blogs Logo"
        />

        {/* Main Content */}
        <main className="posts-section relative max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-16" style={{ paddingTop: '200px' }}>
          {postsLoading ? (
            <div className="space-y-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-2xl p-6 md:p-8">
                  <Skeleton className="h-64 w-full mb-6 bg-gray-700" />
                  <Skeleton className="h-8 w-3/4 mb-4 bg-gray-700" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
                  <Skeleton className="h-4 w-5/6 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            publishedPosts.map((post, index) => (
              <article 
                key={post.id}
                ref={(el) => {
                  if (el) {
                    postRefsMap.current.set(post.id, el);
                  }
                }}
                data-post-id={post.id}
                className={`glass-card rounded-2xl overflow-hidden p-6 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer relative ${
                  viewedPosts.has(post.id) ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                } ${
                  isViewing === post.id ? 'ring-2 ring-yellow-400 ring-opacity-70 animate-pulse' : ''
                } ${
                  likedPosts.has(post.id) ? 'ring-2 ring-red-400 ring-opacity-50' : ''
                }`}
                onClick={() => handleView(post.id, post.title)}
              >
                {/* Status indicators */}
                <div className="status-badges">
                  {/* View status: Reading takes precedence over Viewed */}
                  {isViewing === post.id ? (
                    <div className="status-badge bg-yellow-500 text-black animate-pulse">
                      Reading...
                    </div>
                  ) : (
                    viewedPosts.has(post.id) && (
                      <div className="status-badge bg-blue-500 text-white">
                        Viewed
                      </div>
                    )
                  )}

                  {/* Like status: Liking takes precedence over Liked */}
                  {isLiking === post.id ? (
                    <div className="status-badge bg-pink-500 text-white animate-pulse">
                      Liking...
                    </div>
                  ) : (
                    likedPosts.has(post.id) && (
                      <div className="status-badge bg-red-500 text-white">
                        <Heart className="icon fill-current" />
                        <span>Liked</span>
                      </div>
                    )
                  )}
                </div>
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Blog Post Image" 
                    className="post-image w-full h-64 object-cover rounded-lg mb-6 shadow-lg" 
                    loading="lazy"
                  />
                )}
                
                <div className="post-content">
                  <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                    style={{ lineHeight: '1.8' }}
                  />
                </div>
                
                <div className="action-buttons mt-8 flex justify-between items-center flex-wrap gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <button 
                      className={`action-button like-button flex items-center space-x-2 hover:text-red-400 transition-all ${
                        likedPosts.has(post.id) ? 'bg-red-500 bg-opacity-20 text-red-400' : ''
                      } ${
                        isLiking === post.id ? 'animate-pulse bg-red-500 bg-opacity-30' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(post.id, post.title);
                      }}
                      title={likedPosts.has(post.id) ? "Already liked this post" : "Like this post"}
                      disabled={likedPosts.has(post.id) || isLiking === post.id}
                    >
                      <Heart className={`w-5 h-5 ${
                        likedPosts.has(post.id) ? 'fill-current text-red-400' : ''
                      } ${
                        isLiking === post.id ? 'animate-pulse' : ''
                      }`} />
                      <span className="font-medium">
                        {post.likes}
                        {isLiking === post.id && ' (+1)'}
                      </span>
                    </button>
                    
                    <button 
                      className="action-button share-button flex items-center gap-2 hover:text-blue-400 transition-all max-w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}
                      title="Share this post"
                    >
                      <Share className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate sm:whitespace-normal">Share</span>
                    </button>
                    
                    <div className={`action-button flex items-center gap-2 ${
                      isViewing === post.id ? 'bg-yellow-500 bg-opacity-20 text-yellow-300' : ''
                    }`}>
                      <Eye className={`w-4 h-4 ${isViewing === post.id ? 'animate-pulse' : ''}`} />
                      <span className="text-sm">
                        {post.views} view{post.views !== 1 ? 's' : ''}
                        {isViewing === post.id && ' (+1)'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="post-meta">
                    <p className="text-sm mb-1">
                      {post.author && (
                        <span className="author-name">By {post.author}</span>
                      )}
                    </p>
                    <p className="text-xs opacity-70">
                      {formatTimeAgo(post.createdAt)}
                    </p>
                  </div>
                </div>
              </article>
            ))
          )}
        </main>
      </div>
    </>
  );
}
