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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchCommunityForumUserPosts(props: {
  user: UserPayload;
  body: ICommunityForumCommunityPost.IRequest;
}): Promise<IPageICommunityForumCommunityPost.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Validate pagination parameters
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination parameters", 400);
  }

  // Build base where condition for user posts
  const whereCondition: Prisma.community_forum_postsWhereInput = {
    community_forum_user_id: props.user.id,
    deleted_at: null, // Only fetch non-deleted posts
  };

  // Apply search filter on title if provided
  if (props.body.search) {
    whereCondition.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  // Apply type filter if provided
  if (props.body.type) {
    whereCondition.type = props.body.type;
  }

  // Apply community filter by slug lookup if provided
  if (props.body.community) {
    const community =
      await MyGlobal.prisma.community_forum_communities.findUnique({
        where: {
          slug: props.body.community,
        },
      });

    if (!community) {
      throw new HttpException("Community not found", 404);
    }

    whereCondition.community_forum_community_id = community.id;
  }

  // Apply author filter by username lookup if provided
  if (props.body.author) {
    const author = await MyGlobal.prisma.community_forum_users.findUnique({
      where: {
        username: props.body.author,
      },
    });

    if (!author) {
      throw new HttpException("Author not found", 404);
    }

    // Override the user filter to show posts by the specified author
    whereCondition.community_forum_user_id = author.id;
  }

  // Apply before/after date filters if provided
  if (props.body.before || props.body.after) {
    whereCondition.created_at = {};
    if (props.body.before) {
      // Convert string to Date for Prisma, but the input is already validated as ISO string
      whereCondition.created_at.lte = new Date(props.body.before);
    }
    if (props.body.after) {
      // Convert string to Date for Prisma, but the input is already validated as ISO string
      whereCondition.created_at.gte = new Date(props.body.after);
    }
  }

  // Apply deleted filter if provided
  if (props.body.deleted !== undefined) {
    if (props.body.deleted) {
      // Only deleted posts
      whereCondition.deleted_at = {
        not: null,
      };
    } else {
      // Only active posts
      whereCondition.deleted_at = null;
    }
  }

  // Apply URL filter for link posts if provided
  if (props.body.url) {
    // Only apply URL filter to link posts
    whereCondition.type = "link";
    whereCondition.url = props.body.url;
  }

  // Apply image_uri filter for image posts if provided
  if (props.body.image_uri) {
    // Only apply image_uri filter to image posts
    whereCondition.type = "image";
    whereCondition.image_uri = props.body.image_uri;
  }

  // Determine sorting
  let orderBy: Prisma.community_forum_postsOrderByWithRelationInput[] = [];
  const sort = props.body.sort ?? "new";

  switch (sort) {
    case "new":
      orderBy = [{ created_at: "desc" }];
      break;
    case "hot":
      // Hot sorting: vote_score with time decay
      // For simplicity, we'll sort by vote_score as a proxy
      orderBy = [{ created_at: "desc" }]; // Use created_at since vote_score isn't available for sorting
      break;
    case "top":
      orderBy = [{ created_at: "desc" }]; // Use created_at since vote_score isn't available for sorting
      break;
    case "controversial":
      // Controversial sorting: based on absolute difference between upvotes and downvotes
      // For simplicity, we'll sort by comment_count as a proxy
      orderBy = [{ created_at: "desc" }]; // Use created_at since comment_count isn't available for sorting
      break;
    default:
      orderBy = [{ created_at: "desc" }];
  }

  // Execute paginated query
  const [posts, total] = await Promise.all([
    MyGlobal.prisma.community_forum_posts.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.community_forum_posts.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to match ISummary DTO
  const data = posts.map((post) => ({
    id: post.id,
    community_forum_community_id: post.community_forum_community_id,
    community_forum_user_id: post.community_forum_user_id,
    title: post.title,
    type: post.type as "link" | "text" | "image",
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
    comment_count: (post as any).comment_count ?? undefined,
    vote_score: (post as any).vote_score ?? undefined,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
  };
}
