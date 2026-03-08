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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberHomeFeed(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  // Get member's active subscriptions
  const subscriptions =
    await MyGlobal.prisma.community_platform_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        is_active: true,
      },
      select: { community_id: true },
    });
  const communityIds = subscriptions.map((s) => s.community_id);
  // If no subscriptions, return empty feed
  if (communityIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: props.body.page ?? 1,
        limit: props.body.limit ?? 25,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeFilter = props.body.timeFilter ?? "all_time";
  // Build time filter for 'top' sorting
  const timeCondition =
    sort === "top" ? buildTimeCondition(timeFilter) : undefined;
  // Build base where clause
  const whereInput = {
    community_id: { in: communityIds },
    deleted_at: null,
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
    ...(props.body.contentType && { content_type: props.body.contentType }),
    ...(timeCondition && { created_at: timeCondition }),
  } satisfies Prisma.community_platform_postsWhereInput;
  // Build order by based on sort type
  const orderByInput = buildOrderBy(sort);
  // Query posts with community and author includes
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    include: {
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          subscriber_count: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma: true,
          created_at: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      posts,
      CommunityPlatformPostAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function buildTimeCondition(
  timeFilter: "today" | "this_week" | "this_month" | "this_year" | "all_time",
): Prisma.DateTimeFilter<"community_platform_posts"> | undefined {
  if (timeFilter === "all_time") {
    return undefined;
  }
  const now = new Date();
  const millisecondsInDay = 24 * 60 * 60 * 1000;
  let days: number;
  switch (timeFilter) {
    case "today":
      days = 1;
      break;
    case "this_week":
      days = 7;
      break;
    case "this_month":
      days = 30;
      break;
    case "this_year":
      days = 365;
      break;
    default:
      return undefined;
  }
  const filterDate = new Date(now.getTime() - days * millisecondsInDay);
  return { gte: filterDate };
}
function buildOrderBy(
  sort: "hot" | "new" | "top" | "controversial",
): Prisma.community_platform_postsOrderByWithRelationInput[] {
  switch (sort) {
    case "new":
      return [{ created_at: "desc" as const }];
    case "top":
      return [{ score: "desc" as const }];
    case "controversial":
      // Posts with high engagement but score close to zero
      return [{ comment_count: "desc" as const }, { score: "asc" as const }];
    case "hot":
    default:
      // Hot sorting: recent posts with high score prioritized
      return [{ score: "desc" as const }, { created_at: "desc" as const }];
  }
}
