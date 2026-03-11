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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostsFeedPopular(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.communityId && {
      reddit_platform_community_id: props.body.communityId,
    }),
    ...(props.body.authorId && {
      reddit_platform_member_id: props.body.authorId,
    }),
    ...(props.body.postType && { post_type: props.body.postType }),
    ...(props.body.excludeTypes && {
      NOT: { post_type: { in: props.body.excludeTypes } },
    }),
    ...(props.body.voteScoreRange && {
      vote_score: {
        ...(props.body.voteScoreRange.min !== undefined && {
          gte: props.body.voteScoreRange.min,
        }),
        ...(props.body.voteScoreRange.max !== undefined && {
          lte: props.body.voteScoreRange.max,
        }),
      },
    }),
    ...(props.body.search && {
      title: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.dateRange && {
      created_at: {
        gte: props.body.dateRange.startDate,
        lte: props.body.dateRange.endDate,
      },
    }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Apply time range filter for top sort
  if (props.body.sortBy === "top" && props.body.timeRange) {
    const now = new Date();
    let startDate: Date | undefined;
    switch (props.body.timeRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this_week": {
        const dayOfWeek = now.getDay();
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek,
        );
        break;
      }
      case "this_month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "this_year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "all_time":
        startDate = undefined;
        break;
    }
    if (startDate) {
      const existingFilter = whereInput.created_at;
      if (
        existingFilter &&
        typeof existingFilter === "object" &&
        !Array.isArray(existingFilter)
      ) {
        whereInput.created_at = {
          ...(existingFilter as Record<string, unknown>),
          gte: startDate.toISOString(),
        };
      } else {
        whereInput.created_at = {
          gte: startDate.toISOString(),
        };
      }
    }
  }
  // Build ORDER BY based on sortBy option
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput =
    (() => {
      switch (props.body.sortBy) {
        case "hot":
          return {
            vote_score: "desc",
            created_at: "desc",
          } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
        case "new":
          return {
            created_at: "desc",
          } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
        case "top":
          return {
            vote_score: "desc",
          } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
        case "controversial":
          // Controversial: posts with high engagement but net score near zero
          // Simplified: order by vote_score ASC to get near-zero first, then by engagement
          return {
            vote_score: "asc",
          } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
        default:
          return {
            created_at: "desc",
          } satisfies Prisma.reddit_platform_postsOrderByWithRelationInput;
      }
    })();
  // Apply sort direction override if specified
  if (props.body.sortDirection) {
    const direction = props.body.sortDirection;
    for (const key in orderByInput) {
      orderByInput[key as keyof typeof orderByInput] = direction;
    }
  }
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      post_type: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      reddit_platform_member_id: true,
      reddit_platform_community_id: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (post) => ({
    id: post.id,
    title: post.title,
    post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(post.post_type),
    vote_score: post.vote_score,
    comment_count: post.comment_count,
    author: {
      id: post.reddit_platform_member_id,
    } as IRedditPlatformMember.ISummary,
    community: {
      id: post.reddit_platform_community_id,
    } as IRedditPlatformCommunity.ISummary,
    created_at: toISOStringSafe(post.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
