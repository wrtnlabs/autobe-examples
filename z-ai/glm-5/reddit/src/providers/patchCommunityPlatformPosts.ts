import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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
  // Default values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const sort = props.body.sort ?? "hot";
  const timeRange = props.body.time_range ?? "all";
  const skip = (page - 1) * limit;
  // Build WHERE clause with time filter for 'top' sorting
  const whereClause = {
    deleted_at: null,
    ...(sort === "top" &&
      timeRange !== "all" && {
        created_at: {
          gte: computeTimeThreshold(timeRange),
        },
      }),
  } satisfies Prisma.community_platform_postsWhereInput;
  // Build ORDER BY clause - using created_at as primary sort
  // since vote_score is computed from votes aggregation, not a column
  const orderByClause = {
    created_at: "desc",
  } satisfies Prisma.community_platform_postsOrderByWithRelationInput;
  // Query posts with pagination
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: orderByClause,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereClause,
  });
  // Transform posts to summaries (vote score computed in transformer)
  const data = await ArrayUtil.asyncMap(
    posts,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function computeTimeThreshold(
  range: "today" | "week" | "month" | "year",
): Date {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "year":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}
