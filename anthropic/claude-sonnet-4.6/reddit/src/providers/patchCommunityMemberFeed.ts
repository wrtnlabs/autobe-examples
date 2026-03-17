import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostAtSummaryTransformer } from "../transformers/CommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberFeed(props: {
  member: MemberPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "hot";
  // Fetch active subscriptions
  const subscriptions = await MyGlobal.prisma.community_subscriptions.findMany({
    where: {
      community_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      community_community_id: true,
    },
  });
  // If no subscriptions, return empty response immediately
  if (subscriptions.length === 0) {
    return {
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageICommunityPost.ISummary;
  }
  let subscribedCommunityIds = subscriptions.map(
    (s) => s.community_community_id,
  );
  // Narrow to requested communityId if provided (must be in subscribed list)
  if (props.body.communityId != null) {
    if (subscribedCommunityIds.includes(props.body.communityId)) {
      subscribedCommunityIds = [props.body.communityId];
    } else {
      // communityId not in subscribed list — return empty
      return {
        pagination: {
          current: page,
          limit: limit,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageICommunityPost.ISummary;
    }
  }
  // Build created_at filter combining explicit date range and timeRange (for top sort)
  const createdAtFilter: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (props.body.createdAtFrom != null) {
    createdAtFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo != null) {
    createdAtFilter.lte = new Date(props.body.createdAtTo);
  }
  if (sort === "top") {
    const timeRange = props.body.timeRange ?? "this_week";
    const rangeStart = getTimeRangeStart(timeRange);
    // Only apply timeRange if it's more restrictive than existing gte
    if (createdAtFilter.gte === undefined || rangeStart > createdAtFilter.gte) {
      createdAtFilter.gte = rangeStart;
    }
  }
  const whereInput = {
    deleted_at: null,
    community_community_id: { in: subscribedCommunityIds },
    ...(props.body.keyword != null && {
      title: { contains: props.body.keyword, mode: "insensitive" as const },
    }),
    ...(props.body.type != null && {
      type: props.body.type,
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.community_postsWhereInput;
  // Build ORDER BY based on sort mode
  const orderByInput: Prisma.community_postsOrderByWithRelationInput[] =
    sort === "new"
      ? [{ created_at: "desc" }]
      : sort === "top"
        ? [{ votes: { _count: "desc" } }, { created_at: "desc" }]
        : sort === "controversial"
          ? [{ votes: { _count: "desc" } }, { created_at: "desc" }]
          : [{ created_at: "desc" }]; // hot: approximate by recency
  // Run count and data queries sequentially
  const data = await MyGlobal.prisma.community_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_posts.count({
    where: whereInput,
  });
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageICommunityPost.ISummary;
}
function getTimeRangeStart(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case "today":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "this_week":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "this_month":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "this_year":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "all_time":
    default:
      return new Date(0);
  }
}
