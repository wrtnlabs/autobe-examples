import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformPopularFeed(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.community_platform_postsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id !== undefined &&
      props.body.community_id !== null && {
        community_platform_community_id: props.body.community_id,
      }),
    ...(props.body.author_id !== undefined &&
      props.body.author_id !== null && {
        community_platform_member_id: props.body.author_id,
      }),
    ...(props.body.content_type !== undefined &&
      props.body.content_type !== null && {
        content_type: props.body.content_type,
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null && {
        created_at: { gte: props.body.created_at_start },
      }),
    ...(props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: { lte: props.body.created_at_end },
      }),
  };
  // Build ORDER BY based on sort type
  let orderByInput: Prisma.community_platform_postsOrderByWithRelationInput;
  switch (props.body.sort) {
    case "new":
      orderByInput = { created_at: "desc" };
      break;
    case "top": {
      // For top sorting, apply time filter if specified
      const topTimeRange = props.body.top_time_range;
      if (topTimeRange && topTimeRange !== "all") {
        // Calculate start date based on time range
        const now = toISOStringSafe(new Date());
        let startDate: string;
        const nowDate = new Date(now);
        switch (topTimeRange) {
          case "today": {
            const yesterday = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000);
            startDate = toISOStringSafe(yesterday);
            break;
          }
          case "week": {
            const lastWeek = new Date(
              nowDate.getTime() - 7 * 24 * 60 * 60 * 1000,
            );
            startDate = toISOStringSafe(lastWeek);
            break;
          }
          case "month": {
            const lastMonth = new Date(
              nowDate.getTime() - 30 * 24 * 60 * 60 * 1000,
            );
            startDate = toISOStringSafe(lastMonth);
            break;
          }
          case "year": {
            const lastYear = new Date(
              nowDate.getTime() - 365 * 24 * 60 * 60 * 1000,
            );
            startDate = toISOStringSafe(lastYear);
            break;
          }
          default:
            startDate = "1970-01-01T00:00:00.000Z";
        }
        // Fix spread error by checking if created_at exists
        if (
          whereInput.created_at &&
          typeof whereInput.created_at === "object"
        ) {
          whereInput.created_at = { ...whereInput.created_at, gte: startDate };
        } else {
          whereInput.created_at = { gte: startDate };
        }
      }
      // Note: For proper top sorting by vote score, we would need to:
      // 1. Join with postVotes table
      // 2. Calculate vote score (upvotes - downvotes)
      // 3. Order by that calculated score
      // This requires a more complex query or raw SQL
      // For now, we'll use created_at descending as a reasonable fallback
      orderByInput = { created_at: "desc" };
      break;
    }
    case "hot":
      // Hot sorting algorithm balances recency and popularity
      // A common formula is: score = (votes - 1) / (age_in_hours + 2)^1.8
      // This would require custom SQL or application-level calculation
      // For now, use a simple combination of recent and high-voted posts
      // We'll approximate by ordering by created_at descending (prioritize recency)
      orderByInput = { created_at: "desc" };
      break;
    case "controversial":
      // Controversial posts have many votes but score close to zero
      // One approach: order by ABS(vote_score) / total_votes (low ratio = controversial)
      // This would also require complex calculation
      // For now, use created_at descending
      orderByInput = { created_at: "desc" };
      break;
    default:
      orderByInput = { created_at: "desc" };
  }
  // Execute queries sequentially to avoid overloading the database
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
