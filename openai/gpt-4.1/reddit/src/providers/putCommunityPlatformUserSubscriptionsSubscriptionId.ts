import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscriptionNotifications } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscriptionNotifications";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySubscription.IUpdate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const now = toISOStringSafe(new Date());
  // 1. Find the subscription and ensure it exists, is owned by user, and is not deleted
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        id: props.subscriptionId,
        user_id: props.user.id,
        deleted_at: null,
      },
      include: { community: true },
    });
  if (!subscription) {
    throw new HttpException("Subscription not found or not owned by user", 404);
  }
  // 2. Update notification_enabled in notification settings, update updated_at in both tables
  const notif =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.findFirst(
      {
        where: {
          user_id: props.user.id,
          community_id: subscription.community_id,
        },
      },
    );
  if (!notif) {
    throw new HttpException(
      "Notification settings not found for subscription",
      500,
    );
  }
  await MyGlobal.prisma.community_platform_community_subscription_notifications.update(
    {
      where: { id: notif.id },
      data: {
        notification_enabled: props.body.notification_enabled,
        updated_at: now,
      },
    },
  );
  await MyGlobal.prisma.community_platform_community_subscriptions.update({
    where: { id: props.subscriptionId },
    data: { updated_at: now },
  });
  // Reload updated subscription and notification settings for return
  const reloaded =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.subscriptionId },
        include: { community: true },
      },
    );
  const notification_settings =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.findFirstOrThrow(
      {
        where: {
          user_id: props.user.id,
          community_id: reloaded.community_id,
        },
      },
    );
  // Shape community summary
  const community = reloaded.community;
  const community_summary = {
    id: community.id,
    name: community.name,
    description: community.description,
  };
  // deleted_at is optional+nullable
  return {
    id: reloaded.id,
    user_id: reloaded.user_id,
    community_id: reloaded.community_id,
    community: community_summary,
    notification_settings: {
      id: notification_settings.id,
      user_id: notification_settings.user_id,
      community_id: notification_settings.community_id,
      notification_enabled: notification_settings.notification_enabled,
      created_at: toISOStringSafe(notification_settings.created_at),
      updated_at: toISOStringSafe(notification_settings.updated_at),
    },
    created_at: toISOStringSafe(reloaded.created_at),
    updated_at: toISOStringSafe(reloaded.updated_at),
    deleted_at: reloaded.deleted_at
      ? toISOStringSafe(reloaded.deleted_at)
      : undefined,
  };
}
