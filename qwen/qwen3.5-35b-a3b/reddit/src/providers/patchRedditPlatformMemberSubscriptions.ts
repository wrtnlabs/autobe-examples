import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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

export async function patchRedditPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunitySubscription.IRequest;
}): Promise<IPageIRedditPlatformCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const communityWhere: Pick<
    Prisma.reddit_platform_community_subscriptionsWhereInput,
    "community"
  > = {
    community: {
      deleted_at: null,
    },
  };
  if (
    props.body.serviceName !== undefined &&
    props.body.serviceName !== null &&
    props.body.serviceName.length > 0
  ) {
    communityWhere.community!.name = {
      contains: props.body.serviceName,
      mode: "insensitive",
    };
  }
  const whereClause: Prisma.reddit_platform_community_subscriptionsWhereInput =
    {
      reddit_platform_member_id: props.member.id,
      deleted_at: null,
      ...communityWhere,
    };
  let orderBy: Prisma.reddit_platform_community_subscriptionsOrderByWithRelationInput[];
  const sortOrder = props.body.sortOrder ?? "desc";
  if (props.body.sortBy === "failureCount") {
    orderBy = [
      {
        community: {
          subscriber_count: sortOrder === "asc" ? "asc" : "desc",
        },
      },
    ];
  } else {
    orderBy = [
      {
        subscribed_at: sortOrder,
      },
    ];
  }
  const data =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy,
      include: {
        community: {
          select: {
            id: true,
            name: true,
            icon_url: true,
            subscriber_count: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
      where: whereClause,
    });
  const transformedData = await ArrayUtil.asyncMap(data, async (sub) => {
    if (!sub.community) {
      throw new HttpException("Community not found", 500);
    }
    const idWithType: string & tags.Format<"uuid"> = sub.id;
    const subscribedAtWithType: string & tags.Format<"date-time"> =
      toISOStringSafe(sub.subscribed_at);
    const createdAtWithType: string & tags.Format<"date-time"> =
      toISOStringSafe(sub.created_at);
    const updatedAtWithType: string & tags.Format<"date-time"> =
      toISOStringSafe(sub.updated_at);
    return {
      id: idWithType,
      serviceName: sub.community.name,
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureTime: subscribedAtWithType,
      openedAt: null,
      nextProbeTime: null,
      createdAt: createdAtWithType,
      updatedAt: updatedAtWithType,
    } satisfies IRedditPlatformCommunitySubscription.ISummary;
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination: pagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformCommunitySubscription.ISummary;
}
