import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    community_platform_user_id: props.user.id,
    ...(props.body.status === "active" && { unsubscribed_at: null }),
    ...(props.body.status === "inactive" && { unsubscribed_at: { not: null } }),
    ...(props.body.status !== "inactive" && { unsubscribed_at: null }),
    ...(props.body.search && {
      community: {
        name: { contains: props.body.search, mode: "insensitive" },
      },
    }),
    ...(props.body.subscribed_from && {
      subscribed_at: { gte: new Date(props.body.subscribed_from) },
    }),
    ...(props.body.subscribed_to && {
      subscribed_at: { lte: new Date(props.body.subscribed_to) },
    }),
    ...(props.body.unsubscribed_from && {
      unsubscribed_at: { gte: new Date(props.body.unsubscribed_from) },
    }),
    ...(props.body.unsubscribed_to && {
      unsubscribed_at: { lte: new Date(props.body.unsubscribed_to) },
    }),
  } satisfies Prisma.community_platform_community_subscriptionsWhereInput;
  // Fetch subscriptions with community data
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: whereInput,
      include: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                avatar_url: true,
                karma: true,
                created_at: true,
              },
            },
          },
        },
      },
      orderBy: { subscribed_at: "desc" },
      skip,
      take: limit,
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: whereInput,
    });
  // Transform data to DTO format
  const data = subscriptions.map((sub) => ({
    id: sub.id,
    subscribed_at: sub.subscribed_at.toISOString(),
    community: {
      id: sub.community.id,
      name: sub.community.name,
      description: sub.community.description,
      icon_url: sub.community.icon_url,
      owner: {
        id: sub.community.owner.id,
        username: sub.community.owner.username,
        display_name: sub.community.owner.display_name,
        avatar_url: sub.community.owner.avatar_url,
        karma: sub.community.owner.karma,
        created_at: sub.community.owner.created_at.toISOString(),
      } satisfies ICommunityPlatformUser.ISummary,
      created_at: sub.community.created_at.toISOString(),
    } satisfies ICommunityPlatformCommunity.ISummary,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageICommunityPlatformCommunitySubscription.ISummary;
}
