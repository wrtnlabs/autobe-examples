import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestPostsSearch(props: {
  guest: GuestPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  // Validate pagination parameters
  const page = (props.body.page ?? 1) as number & tags.Type<"int32">;
  const limit = (props.body.limit ?? 20) as number & tags.Type<"int32">;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Validate date range
  if (props.body.dateRange) {
    if (props.body.dateRange.startDate > props.body.dateRange.endDate) {
      throw new HttpException(
        "Start date must be before or equal to end date",
        400,
      );
    }
  }
  // Validate sort parameter
  const validSortOptions = ["new", "hot", "top", "controversial"] as const;
  if (props.body.sortBy && !validSortOptions.includes(props.body.sortBy)) {
    throw new HttpException("Invalid sort option", 400);
  }
  // Validate sort direction
  if (
    props.body.sortDirection &&
    !(["asc", "desc"] as const).includes(props.body.sortDirection)
  ) {
    throw new HttpException("Invalid sort direction", 400);
  }
  // Build base WHERE clause
  const whereConditions: Array<Prisma.reddit_platform_postsWhereInput> = [
    { deleted_at: null },
  ];
  // Add filters
  if (props.body.communityId) {
    whereConditions.push({
      reddit_platform_community_id: props.body.communityId,
    });
  }
  if (props.body.postType) {
    whereConditions.push({ post_type: props.body.postType });
  }
  if (props.body.dateRange) {
    whereConditions.push({
      created_at: {
        gte: props.body.dateRange.startDate,
        lte: props.body.dateRange.endDate,
      },
    });
  }
  if (props.body.voteScoreRange) {
    whereConditions.push({
      vote_score: {
        gte: props.body.voteScoreRange.min,
        lte: props.body.voteScoreRange.max,
      },
    });
  }
  // Handle excludeTypes - these should exclude posts matching the types
  if (props.body.excludeTypes && props.body.excludeTypes.length > 0) {
    const excludedWhere: Prisma.reddit_platform_postsWhereInput = {
      NOT: [...props.body.excludeTypes.map((type) => ({ post_type: type }))],
    };
    whereConditions.push(excludedWhere);
  }
  // Handle search and authorId - these create OR conditions
  if (props.body.search || props.body.authorId) {
    const orConditions: Array<Prisma.reddit_platform_postsWhereInput> = [];
    if (props.body.search) {
      orConditions.push({
        title: { contains: props.body.search, mode: "insensitive" },
      });
    }
    if (props.body.authorId) {
      orConditions.push({ reddit_platform_member_id: props.body.authorId });
    }
    whereConditions.push({ OR: orConditions });
  }
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    AND: whereConditions,
  };
  // Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    [];
  if (props.body.sortBy === "hot") {
    // Fallback to created_at since last_viewed_at is not in the type
    orderByInput.push({
      created_at: props.body.sortDirection === "asc" ? "asc" : "desc",
    });
  } else if (props.body.sortBy === "top") {
    orderByInput.push({
      vote_score: props.body.sortDirection === "asc" ? "asc" : "desc",
    });
  } else if (props.body.sortBy === "controversial") {
    // Controversial: use upvote/downvote ratio - requires joining with votes
    // For now, fallback to created_at with desc (newest controversial first)
    orderByInput.push({
      created_at: "desc",
    });
  } else {
    // Default: new (created_at desc)
    orderByInput.push({
      created_at: props.body.sortDirection === "asc" ? "asc" : "desc",
    });
  }
  // Calculate skip
  const skip = (page - 1) * limit;
  // Query posts with joins for author and community
  const posts = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    include: {
      author: RedditPlatformMemberAtSummaryTransformer.select(),
      community: RedditPlatformCommunityAtSummaryTransformer.select(),
      comments: true,
      postVotes: true,
      snapshots: true,
      images: true,
      engagementStats: true,
      moderationAuditLogs: true,
    } satisfies Prisma.reddit_platform_postsInclude,
  });
  // Transform to summary format
  const data = await ArrayUtil.asyncMap(posts, async (post) => {
    const summary =
      await RedditPlatformPostAtSummaryTransformer.transform(post);
    return summary satisfies IRedditPlatformPost.ISummary;
  });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
