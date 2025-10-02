import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  category: text("category"), // Temporary backwards compatibility
  imageUrl: text("image_url"),
  imageFileName: text("image_file_name"),
  views: integer("views").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  views: true,
  likes: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  category: z.string().optional(), // Make category optional since we're transitioning to author
  author: z.string().min(1, 'Author is required'),
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
