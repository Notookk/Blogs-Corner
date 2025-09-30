# Overview

This is a full-stack blog application built with React, Express, and PostgreSQL. The application provides both an admin dashboard for content management and a public-facing blog interface. It features real-time updates via Server-Sent Events (SSE), image uploads, and a comprehensive post management system with view tracking and like functionality.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server, configured to serve from the `client` directory
- Wouter for lightweight client-side routing (paths: `/`, `/admin`, `/blog`)
- React Query (TanStack Query) for server state management with disabled auto-refetch to rely on SSE for updates

**UI Component Strategy**
- Shadcn UI components (Radix UI primitives) with the "new-york" style preset
- Tailwind CSS for styling with CSS custom properties for theming
- Component aliases configured for clean imports (`@/components`, `@/lib`, etc.)
- Custom FileUpload component using react-dropzone for image handling

**State Management Approach**
- Server state managed via React Query with custom `queryClient` configuration
- SSE hook (`useSSE`) for real-time data synchronization by invalidating queries on events
- Form state handled by React Hook Form with Zod schema validation
- No global client state - relying on server state and local component state

## Backend Architecture

**Server Framework**
- Express.js with TypeScript
- Custom middleware for JSON request logging (truncated to 80 characters)
- Request body buffer preservation for potential webhook integrations
- Development mode uses Vite middleware for HMR; production serves static files

**API Design**
- RESTful endpoints under `/api` prefix
- SSE endpoint at `/api/events` for real-time updates
- Multer middleware for multipart/form-data image uploads (10MB limit, JPEG/PNG/WebP only)
- File uploads served from `/uploads` directory

**Storage Layer**
- Abstract `IStorage` interface allows swappable storage implementations
- `MemStorage` class provides in-memory storage with file system image persistence
- Designed to support database migration (Drizzle ORM configured for PostgreSQL)
- Posts stored with metadata: id, title, content, category, imageUrl, views, likes, published status, timestamps

**Real-time Communication**
- Server-Sent Events for broadcasting updates (post_created, post_updated, post_deleted, post_liked)
- Connection management with automatic cleanup on client disconnect
- Broadcasts trigger React Query cache invalidation on client side

## Data Storage Solutions

**Database Schema (Drizzle ORM)**
- PostgreSQL configuration with Neon serverless driver
- Schema defined in `shared/schema.ts` for type sharing between client and server
- Posts table with UUID primary keys, text fields, integer counters, boolean flags, and timestamps
- Zod schemas generated from Drizzle for runtime validation

**File Storage**
- Images stored in `uploads/` directory on file system
- Image metadata (URL and filename) stored alongside post data
- Orphaned file cleanup on post deletion

**Current State**
- Application currently uses in-memory storage (`MemStorage`)
- Database configuration present but not actively used
- Migration path clear: swap `MemStorage` for database implementation

## External Dependencies

**UI Component Library**
- Radix UI primitives for accessible, unstyled components
- Shadcn UI configuration for consistent design system
- Tailwind CSS for utility-first styling

**Database & ORM**
- Drizzle ORM with Drizzle Kit for schema management
- PostgreSQL via @neondatabase/serverless driver
- Connection string expected via `DATABASE_URL` environment variable

**File Upload Handling**
- Multer for multipart form parsing
- React Dropzone for client-side file selection UI
- File type validation on both client and server

**Development Tools**
- Replit-specific plugins for error overlay, cartographer, and dev banner
- TSX for running TypeScript in development
- ESBuild for production server bundling

**Session Management**
- connect-pg-simple for PostgreSQL session store (configured but not actively used)
- Prepared for authentication implementation

**Date Utilities**
- date-fns for date formatting and manipulation

**Form Handling**
- React Hook Form for form state management
- Zod for schema validation
- @hookform/resolvers for Zod integration