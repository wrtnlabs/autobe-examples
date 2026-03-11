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
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPosts(props: {
  body: IRedditPlatformPost.IRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.communityId && {
      reddit_platform_community_id: props.body.communityId,
    }),
    ...(props.body.authorId && {
      reddit_platform_member_id: props.body.authorId,
    }),
    ...(props.body.postType && {
      post_type: props.body.postType.toUpperCase() as "TEXT" | "LINK" | "IMAGE",
    }),
    ...(props.body.excludeTypes && {
      NOT: props.body.excludeTypes.map((type) => ({
        post_type: type.toUpperCase() as "TEXT" | "LINK" | "IMAGE",
      })),
    }),
    ...(props.body.dateRange && {
      created_at: {
        gte: toISOStringSafe(props.body.dateRange.startDate),
        lte: toISOStringSafe(props.body.dateRange.endDate),
      },
    }),
  };
  // Apply time range filter to WHERE clause for "top" sortBy
  if (props.body.sortBy === "top" && props.body.timeRange) {
    const timeFilter = timeRangeFilter(props.body.timeRange);
    // Fix: Avoid spreading whereInput.created_at which may be undefined or a union type
    if (whereInput.created_at) {
      // Check if it has gte field to avoid TypeScript inference issues
      const existingCreatedAt = whereInput.created_at as {
        gte?: string;
        lte?: string;
      };
      whereInput.created_at = {
        gte: existingCreatedAt.gte ?? timeFilter.gte,
        lte: existingCreatedAt.lte,
      };
    } else {
      whereInput.created_at = {
        gte: timeFilter.gte,
      };
    }
  }
  // Build ORDER BY clause based on sortBy
  const orderByInput: Prisma.reddit_platform_postsOrderByWithRelationInput[] =
    props.body.sortBy === "new"
      ? [{ created_at: props.body.sortDirection === "asc" ? "asc" : "desc" }]
      : props.body.sortBy === "hot"
        ? [
            { vote_score: props.body.sortDirection === "asc" ? "asc" : "desc" },
            { created_at: props.body.sortDirection === "asc" ? "asc" : "desc" },
          ]
        : props.body.sortBy === "top"
          ? [
              {
                vote_score: props.body.sortDirection === "asc" ? "asc" : "desc",
              },
            ]
          : props.body.sortBy === "controversial"
            ? [
                {
                  comment_count:
                    props.body.sortDirection === "asc" ? "asc" : "desc",
                },
              ]
            : [{ created_at: "desc" }];
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformPostAtSummaryTransformer.transform,
    ),
  };
}
function timeRangeFilter(
  timeRange: "today" | "this_week" | "this_month" | "this_year" | "all_time",
): {
  gte: string & tags.Format<"date-time">;
} {
  const now = new Date();
  const startDate = new Date();
  switch (timeRange) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      break;
    case "this_week":
      const day = now.getDay();
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      startDate.setMonth(now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "this_year":
      startDate.setFullYear(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "all_time":
      // Return very old date for all_time
      startDate.setFullYear(1970, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
  }
  return {
    gte: toISOStringSafe(startDate),
  };
}
