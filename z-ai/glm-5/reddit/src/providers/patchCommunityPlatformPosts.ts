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

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Build base where clause
  const baseWhere = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          text_content: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.contentType && { content_type: props.body.contentType }),
    ...(props.body.communityId && { community_id: props.body.communityId }),
  };
  // Build order by clause based on sort type
  const sort = props.body.sort ?? "hot";
  let orderByInput:
    | Prisma.community_platform_postsOrderByWithRelationInput
    | Prisma.community_platform_postsOrderByWithRelationInput[];
  let timeFilterWhere = {};
  if (sort === "new") {
    orderByInput = { created_at: "desc" as const };
  } else if (sort === "top") {
    // Apply time filter for top sorting
    const timeFilter = props.body.timeFilter ?? "all_time";
    if (timeFilter !== "all_time") {
      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      let daysBack = 0;
      if (timeFilter === "today") {
        daysBack = 1;
      } else if (timeFilter === "this_week") {
        daysBack = 7;
      } else if (timeFilter === "this_month") {
        daysBack = 30;
      } else if (timeFilter === "this_year") {
        daysBack = 365;
      }
      if (daysBack > 0) {
        const dateBoundary = new Date(now.getTime() - daysBack * msPerDay);
        timeFilterWhere = { created_at: { gte: dateBoundary } };
      }
    }
    orderByInput = { score: "desc" as const };
  } else if (sort === "controversial") {
    // Controversial: high total votes but score near zero
    // This would ideally use a computed field, but for simplicity use score absolute value
    orderByInput = [
      { comment_count: "desc" as const },
      { score: "asc" as const },
    ];
  } else {
    // Hot sorting: prioritize recent posts with high engagement
    // Using score and recency as a simplified approach
    orderByInput = [
      { score: "desc" as const },
      { created_at: "desc" as const },
    ];
  }
  // Combine where clauses
  const whereInput = {
    ...baseWhere,
    ...timeFilterWhere,
  } satisfies Prisma.community_platform_postsWhereInput;
  // Query posts with transformer select
  const data = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Transform results using transformer
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
