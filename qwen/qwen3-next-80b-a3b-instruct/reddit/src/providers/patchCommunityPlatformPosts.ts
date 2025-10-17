import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const { body } = props;

  // Extract pagination params with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where conditions based on IRequest
  const where: Prisma.community_platform_postsWhereInput & {
    OR?: any[];
    community_platform_community_id?: string;
    author_id?: string;
    created_at?: {
      gte?: Date | string;
      lte?: Date | string;
    };
    vote_count?: {
      gte?: number;
      lte?: number;
    };
  } = {
    status: "published",
  };

  // Search: full-text search on title and content
  if (body.q && body.q.trim()) {
    const searchTerm = body.q.trim();
    where.OR = [
      { title: { contains: searchTerm } },
      { content: { contains: searchTerm } },
    ];
  }

  // Filter by community
  if (body.community_id) {
    where.community_platform_community_id = body.community_id;
  }

  // Filter by author
  if (body.author_id) {
    where.author_id = body.author_id;
  }

  // Time range filtering
  if (body.min_created_at) {
    if (!where.created_at) where.created_at = {};
    where.created_at.gte = body.min_created_at;
  }
  if (body.max_created_at) {
    if (!where.created_at) where.created_at = {};
    where.created_at.lte = body.max_created_at;
  }

  // Vote count filtering
  if (body.min_vote_count !== undefined) {
    where.vote_count = where.vote_count || {};
    where.vote_count.gte = body.min_vote_count;
  }
  if (body.max_vote_count !== undefined) {
    where.vote_count = where.vote_count || {};
    where.vote_count.lte = body.max_vote_count;
  }

  // Status filtering - override if provided (but published is forced)
  if (body.status) {
    where.status = body.status;
  }

  // Order by
  let orderBy: Prisma.community_platform_postsOrderByWithRelationInput = {};
  switch (body.sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "hot":
      // Hot algorithm: combined recency and popularity
      // Note: Prisma cannot do complex math - implement in application layer
      // For now, fall back to 'new' as approximation
      orderBy = { created_at: "desc" };
      break;
    case "top":
      orderBy = { vote_count: "desc", created_at: "desc" };
      break;
    case "controversial":
      // Controversial: ratio of upvotes to downvotes - approximated by absolute vote_count since we don't have upvotes/downvotes split
      orderBy = { vote_count: "desc", created_at: "desc" };
      break;
    case undefined:
    default:
      // Default sort from platform settings - not accessible here, fall back to 'new'
      orderBy = { created_at: "desc" };
      break;
  }

  // Query posts
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      post_type: true,
      vote_count: true,
      comment_count: true,
      status: true,
      created_at: true,
    },
  });

  // Count total
  const total = await MyGlobal.prisma.community_platform_posts.count({ where });

  // Convert dates and map to summary type
  const summaries: ICommunityPlatformPost.ISummary[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content ?? undefined,
    post_type: post.post_type,
    vote_count: post.vote_count,
    comment_count: post.comment_count,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
  }));

  // Build pagination
  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data: summaries,
  };
}
