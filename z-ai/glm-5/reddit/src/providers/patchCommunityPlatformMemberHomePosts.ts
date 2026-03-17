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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberHomePosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  const timeRange = props.body.time_range ?? "all";
  // Query subscriptions to get member's subscribed community IDs
  // Using raw Prisma query since subscription table may have different naming
  const subscriptions = await MyGlobal.prisma.$queryRaw<
    Array<{
      community_platform_community_id: string;
    }>
  >`
    SELECT community_platform_community_id
    FROM community_platform_subscriptions
    WHERE community_platform_member_id = ${props.member.id}
    AND deleted_at IS NULL
  `;
  const subscribedCommunityIds = subscriptions.map(
    (s) => s.community_platform_community_id,
  );
  // If member has no subscriptions, return empty page
  if (subscribedCommunityIds.length === 0) {
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
  // Build time filter for 'top' sorting using Prisma raw
  const timeConditions: Record<string, string> = {
    today: "NOW() - INTERVAL '1 day'",
    week: "NOW() - INTERVAL '7 days'",
    month: "NOW() - INTERVAL '30 days'",
    year: "NOW() - INTERVAL '365 days'",
    all: "'1970-01-01'::timestamptz",
  };
  // Build base where clause for non-raw queries
  const baseWhere: Prisma.community_platform_postsWhereInput = {
    community_id: { in: subscribedCommunityIds },
    deleted_at: null,
    ...(sort === "top" &&
      timeRange !== "all" && {
        created_at: {
          gte: new Date(
            Date.now() -
              (timeRange === "today"
                ? 1
                : timeRange === "week"
                  ? 7
                  : timeRange === "month"
                    ? 30
                    : 365) *
                24 *
                60 *
                60 *
                1000,
          ),
        },
      }),
  };
  // Build orderBy based on sort
  const orderBy: Prisma.community_platform_postsOrderByWithRelationInput =
    (() => {
      switch (sort) {
        case "new":
          return { created_at: "desc" as const };
        case "top":
          return { created_at: "desc" as const };
        case "controversial":
          return { created_at: "desc" as const };
        case "hot":
        default:
          return { created_at: "desc" as const };
      }
    })();
  // Query posts
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: baseWhere,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformPostAtSummaryTransformer.select(),
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: baseWhere,
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
