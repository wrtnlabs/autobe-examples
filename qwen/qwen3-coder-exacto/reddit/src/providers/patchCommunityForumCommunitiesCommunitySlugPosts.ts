import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import { IPageICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityForumCommunitiesCommunitySlugPosts(props: {
  communitySlug: string;
  body: ICommunityForumCommunityPost.IRequest;
}): Promise<IPageICommunityForumCommunityPost.ISummary> {
  // Find the community by slug
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: { slug: props.communitySlug },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions
  const where: Prisma.community_forum_postsWhereInput = {
    community_forum_community_id: community.id,
    deleted_at:
      props.body.deleted === true
        ? { not: null }
        : props.body.deleted === false
          ? null
          : undefined,
  };

  // Apply title search
  if (props.body.search) {
    where.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  // Apply type filter
  if (props.body.type) {
    where.type = props.body.type;
  }

  // Apply author filter
  if (props.body.author) {
    const author = await MyGlobal.prisma.community_forum_users.findUnique({
      where: { username: props.body.author },
    });

    if (author) {
      where.community_forum_user_id = author.id;
    } else {
      // If author not found, return empty result
      return {
        data: [],
        pagination: {
          current: page,
          limit,
          records: 0,
          pages: 0,
        },
      };
    }
  }

  // Apply date range filters without using Date constructor
  if (props.body.before || props.body.after) {
    where.created_at = {};
    if (props.body.before) {
      where.created_at.lte = props.body.before as unknown as Date;
    }
    if (props.body.after) {
      where.created_at.gte = props.body.after as unknown as Date;
    }
  }

  // Apply URL filter for link posts
  if (props.body.url) {
    where.url = props.body.url;
  }

  // Apply image URI filter for image posts
  if (props.body.image_uri) {
    where.image_uri = props.body.image_uri;
  }

  // Build orderBy clause based on sort parameter
  let orderBy: Prisma.community_forum_postsOrderByWithRelationInput = {
    created_at: "desc",
  };

  switch (props.body.sort) {
    case "new":
      orderBy = { created_at: "desc" };
      break;
    case "top":
      // For a real implementation, we would sort by vote score
      // For now we'll sort by created_at as a placeholder
      orderBy = { created_at: "desc" };
      break;
    case "hot":
      // For a real implementation, we would use a complex algorithm
      // For now we'll sort by created_at as a placeholder
      orderBy = { created_at: "desc" };
      break;
    case "controversial":
      // For a real implementation, we would sort by controversy score
      // For now we'll sort by created_at as a placeholder
      orderBy = { created_at: "desc" };
      break;
    default:
      orderBy = { created_at: "desc" };
  }

  // Execute query with pagination
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.community_forum_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_posts.count({ where }),
  ]);

  // Map to summary DTO
  const data = posts.map((post) => ({
    id: post.id,
    community_forum_community_id: post.community_forum_community_id,
    community_forum_user_id: post.community_forum_user_id,
    title: post.title,
    type: post.type as "text" | "link" | "image",
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    // Note: comment_count and vote_score would normally come from related tables or cached values
    // For now we're leaving them undefined as they're optional in the interface
  }));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
