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

export async function patchCommunityPlatformPopular(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 25, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeFilter = props.body.timeFilter ?? "all_time";
  // Build WHERE clause with filters for non-deleted records
  const whereInput = {
    deleted_at: null,
    author: { deleted_at: null },
    community: { deleted_at: null },
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
    ...(props.body.contentType && {
      content_type: props.body.contentType,
    }),
    ...(props.body.communityId && {
      community_id: props.body.communityId,
    }),
    ...(sort === "top" && getTimeFilterCondition(timeFilter)),
  } satisfies Prisma.community_platform_postsWhereInput;
  // Build ORDER BY clause based on sort type
  const orderByInput = getOrderByInput(sort);
  // Query posts with pagination
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  // Transform posts to response DTOs
  const data = await ArrayUtil.asyncMap(
    posts,
    CommunityPlatformPostAtSummaryTransformer.transform,
  );
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
function getTimeFilterCondition(
  timeFilter: "today" | "this_week" | "this_month" | "this_year" | "all_time",
): Prisma.community_platform_postsWhereInput {
  const now = new Date();
  switch (timeFilter) {
    case "today":
      return {
        created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      };
    case "this_week":
      return {
        created_at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      };
    case "this_month":
      return {
        created_at: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      };
    case "this_year":
      return {
        created_at: {
          gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        },
      };
    case "all_time":
    default:
      return {};
  }
}
function getOrderByInput(
  sort: "hot" | "new" | "top" | "controversial",
): Prisma.Enumerable<Prisma.community_platform_postsOrderByWithRelationInput> {
  switch (sort) {
    case "new":
      return { created_at: "desc" };
    case "top":
      return { score: "desc" };
    case "controversial":
      return [{ comment_count: "desc" }, { score: "asc" }];
    case "hot":
    default:
      return [{ score: "desc" }, { created_at: "desc" }];
  }
}
