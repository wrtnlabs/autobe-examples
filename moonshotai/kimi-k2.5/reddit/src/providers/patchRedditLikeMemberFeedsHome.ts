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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostAtSummaryTransformer } from "../transformers/RedditLikePostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditLikePost.IRequest;
}): Promise<IPageIRedditLikePost.ISummary> {
  // Get all active community subscriptions for the member
  const subscriptions =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        reddit_like_community_id: true,
      },
    });
  const subscribedCommunityIds = subscriptions.map(
    (s) => s.reddit_like_community_id,
  );
  // If no subscriptions, return empty page
  if (subscribedCommunityIds.length === 0) {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 20;
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build where clause
  const where: Prisma.reddit_like_postsWhereInput = {
    community_id: {
      in: subscribedCommunityIds,
    },
    is_deleted: false,
  };
  // Apply additional filters from request body
  if (props.body.communityId) {
    where.community_id = props.body.communityId;
  }
  if (props.body.authorId) {
    where.author_id = props.body.authorId;
  }
  if (props.body.postType) {
    where.post_type = props.body.postType;
  }
  if (props.body.search) {
    where.title = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Date range filtering
  if (props.body.createdAfter || props.body.createdBefore) {
    where.created_at = {};
    if (props.body.createdAfter) {
      where.created_at.gte = new Date(props.body.createdAfter);
    }
    if (props.body.createdBefore) {
      where.created_at.lte = new Date(props.body.createdBefore);
    }
  }
  // Time filter for top/controversial sorting
  if (props.body.timeFilter && props.body.timeFilter !== "all_time") {
    const now = new Date();
    let cutoffDate: Date;
    switch (props.body.timeFilter) {
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
    where.created_at = {
      ...((where.created_at ?? {}) as object),
      gte: cutoffDate,
    };
  }
  // Determine sorting
  let orderBy:
    | Prisma.reddit_like_postsOrderByWithRelationInput
    | Prisma.reddit_like_postsOrderByWithRelationInput[];
  if (props.body.sort) {
    switch (props.body.sort) {
      case "hot":
        // Hot: combination of vote_score and recency
        // Use vote_score as primary, created_at as secondary
        orderBy = [{ vote_score: "desc" }, { created_at: "desc" }];
        break;
      case "new":
        orderBy = { created_at: "desc" };
        break;
      case "top":
        orderBy = { vote_score: "desc" };
        break;
      case "controversial":
        // Controversial: high engagement but near-zero score
        // Approximate with comment_count desc, vote_score asc
        orderBy = [{ comment_count: "desc" }, { vote_score: "asc" }];
        break;
    }
  } else if (props.body.sortBy) {
    const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
    orderBy = { [props.body.sortBy]: sortOrder };
  } else {
    // Default: newest first
    orderBy = { created_at: "desc" };
  }
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Execute queries
  const posts = await MyGlobal.prisma.reddit_like_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditLikePostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_posts.count({
    where,
  });
  // Transform results
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    RedditLikePostAtSummaryTransformer.transform,
  );
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
