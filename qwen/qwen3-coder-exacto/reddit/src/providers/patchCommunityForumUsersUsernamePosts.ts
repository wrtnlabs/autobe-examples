import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import { IPageICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityForumUsersUsernamePosts(props: {
  username: string;
  body: ICommunityForumCommunityPost.IRequest;
}): Promise<IPageICommunityForumCommunityPost.ISummary> {
  // First verify the user exists
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { username: props.username },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Set default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Prisma.community_forum_postsWhereInput = {
    community_forum_user_id: user.id,
    deleted_at: null, // Only fetch non-deleted posts by default
  };

  // Apply filters
  if (props.body.search) {
    whereConditions.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  if (props.body.type) {
    whereConditions.type = props.body.type;
  }

  if (props.body.community) {
    const community =
      await MyGlobal.prisma.community_forum_communities.findUnique({
        where: { slug: props.body.community },
      });

    if (community) {
      whereConditions.community_forum_community_id = community.id;
    }
  }

  // Handle time range filters
  if (props.body.before || props.body.after) {
    const createdAtConditions: any = {};
    if (props.body.before) {
      createdAtConditions.lte = props.body.before;
    }
    if (props.body.after) {
      createdAtConditions.gte = props.body.after;
    }
    whereConditions.created_at = createdAtConditions;
  }

  if (props.body.deleted !== undefined) {
    if (props.body.deleted) {
      whereConditions.NOT = [
        {
          deleted_at: null,
        },
      ];
    } else {
      whereConditions.deleted_at = null;
    }
  }

  if (props.body.url) {
    whereConditions.url = props.body.url;
  }

  if (props.body.image_uri) {
    whereConditions.image_uri = props.body.image_uri;
  }

  // Determine sort order
  let orderBy: Prisma.community_forum_postsOrderByWithRelationInput[] = [
    { created_at: "desc" },
  ];

  // Note: Full implementation of hot/top/controversial would require additional DB fields
  // For now, we'll implement based on what we have available
  switch (props.body.sort) {
    case "hot":
    case "top":
    case "controversial":
      // These would require additional scoring fields in the database
      // For now, we default to sorting by creation date
      orderBy = [{ created_at: "desc" }];
      break;
    case "new":
    default:
      orderBy = [{ created_at: "desc" }];
      break;
  }

  // Execute query with pagination
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.community_forum_posts.findMany({
      where: whereConditions,
      orderBy: orderBy,
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.community_forum_posts.count({
      where: whereConditions,
    }),
  ]);

  // Transform to API response format
  const transformedPosts = posts.map((post) => ({
    id: post.id,
    community_forum_community_id: post.community_forum_community_id,
    community_forum_user_id: post.community_forum_user_id,
    title: post.title,
    type: post.type as "text" | "link" | "image",
    created_at: post.created_at
      ? toISOStringSafe(post.created_at)
      : (null as any),
    updated_at: post.updated_at
      ? toISOStringSafe(post.updated_at)
      : (null as any),
    comment_count: undefined, // Would need to be implemented
    vote_score: undefined, // Would need to be implemented
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedPosts,
  };
}
