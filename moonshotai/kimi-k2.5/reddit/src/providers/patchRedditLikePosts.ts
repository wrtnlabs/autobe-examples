import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikePosts(props: {
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  const body = props.body;
  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereConditions: Prisma.reddit_like_postsWhereInput[] = [
    { is_deleted: false },
  ];
  // Search filter (trigram similarity on title)
  if (body.search !== undefined && body.search.length > 0) {
    whereConditions.push({
      title: {
        contains: body.search,
        mode: "insensitive",
      },
    });
  }
  // Community filter
  if (body.communityId !== undefined) {
    whereConditions.push({
      community_id: body.communityId,
    });
  }
  // Author filter
  if (body.authorId !== undefined) {
    whereConditions.push({
      author_id: body.authorId,
    });
  }
  // Post type filter
  if (body.postType !== undefined) {
    whereConditions.push({
      post_type: body.postType,
    });
  }
  // Date range filters
  if (body.createdAfter !== undefined) {
    whereConditions.push({
      created_at: {
        gte: new Date(body.createdAfter),
      },
    });
  }
  if (body.createdBefore !== undefined) {
    whereConditions.push({
      created_at: {
        lte: new Date(body.createdBefore),
      },
    });
  }
  // Time filter for sorting
  if (body.timeFilter !== undefined && body.timeFilter !== "all_time") {
    const now = new Date();
    let cutoffDate: Date;
    switch (body.timeFilter) {
      case "today":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    whereConditions.push({
      created_at: {
        gte: cutoffDate,
      },
    });
  }
  const whereInput = {
    AND: whereConditions,
  } satisfies Prisma.reddit_like_postsWhereInput;
  // Build ORDER BY
  let orderBy: Prisma.reddit_like_postsOrderByWithRelationInput;
  if (body.sortBy !== undefined) {
    const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";
    switch (body.sortBy) {
      case "created_at":
        orderBy = { created_at: sortOrder };
        break;
      case "vote_score":
        orderBy = { vote_score: sortOrder };
        break;
      case "comment_count":
        orderBy = { comment_count: sortOrder };
        break;
      default:
        orderBy = { created_at: "desc" };
    }
  } else if (body.sort !== undefined) {
    switch (body.sort) {
      case "new":
        orderBy = { created_at: "desc" };
        break;
      case "top":
        orderBy = { vote_score: "desc" };
        break;
      case "controversial":
        // Controversial: high total activity (votes + comments) but low net score
        // Use comment_count as proxy for controversial sorting
        orderBy = { comment_count: "desc" };
        break;
      case "hot":
      default:
        // Hot: combination of vote_score and recency
        // Default to created_at desc as hot sorting requires complex calculation
        orderBy = { created_at: "desc" };
        break;
    }
  } else {
    // Default: newest first
    orderBy = { created_at: "desc" };
  }
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where: whereInput,
  });
  // Get posts with transformer select
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  // Transform posts
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = Math.ceil(total / limit);
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
  };
}
