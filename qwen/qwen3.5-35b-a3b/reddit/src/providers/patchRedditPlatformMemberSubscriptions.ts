import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditPlatformCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunitySubscription.IRequest;
}): Promise<IPageIRedditPlatformCommunitySubscription.ISummary> {
  const status = props.body.status ?? "ACTIVE";
  const cursor = props.body.cursor;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  // Build WHERE clause for filtering
  const whereClause: Prisma.reddit_platform_community_subscriptionsWhereInput =
    {
      reddit_platform_member_id: props.member.id,
      deleted_at: status === "ACTIVE" ? null : { not: null },
    };
  // Add date range filters
  if (props.body.subscribedAtFrom) {
    whereClause.subscribed_at = { gte: new Date(props.body.subscribedAtFrom) };
  }
  if (props.body.subscribedAtTo) {
    whereClause.subscribed_at =
      whereClause.subscribed_at && typeof whereClause.subscribed_at === "object"
        ? {
            ...whereClause.subscribed_at,
            lte: new Date(props.body.subscribedAtTo),
          }
        : {
            lte: new Date(props.body.subscribedAtTo),
          };
  }
  // Add cursor-based pagination if cursor provided
  if (cursor) {
    try {
      const cursorData = JSON.parse(
        Buffer.from(cursor, "base64").toString("utf-8"),
      );
      whereClause.OR = [
        { subscribed_at: { gt: cursorData.subscribed_at } },
        {
          subscribed_at: cursorData.subscribed_at,
          id: { gt: cursorData.id },
        },
      ];
    } catch {
      throw new HttpException("Invalid cursor format", 400);
    }
  }
  // Add community name search via JOIN
  if (props.body.communityNameSearch) {
    whereClause.community = {
      name: {
        contains: props.body.communityNameSearch,
        mode: "insensitive",
      },
    };
  }
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "SUBSCRIBED_AT";
  const sortOrder = props.body.sortOrder ?? "DESC";
  const orderByInput = (() => {
    switch (sortBy) {
      case "SUBSCRIBED_AT":
        return { subscribed_at: sortOrder };
      case "COMMUNITY_NAME":
        return { community: { name: sortOrder } };
      case "SUBSCRIBER_COUNT":
        return { community: { subscriber_count: sortOrder } };
      default:
        return { subscribed_at: sortOrder };
    }
  }) as Prisma.reddit_platform_community_subscriptionsOrderByWithRelationInput;
  // Execute query
  const data =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: whereClause,
      orderBy: orderByInput,
      take: limit,
      ...RedditPlatformCommunitySubscriptionAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
      where: whereClause,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformCommunitySubscriptionAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformCommunitySubscription.ISummary;
}
