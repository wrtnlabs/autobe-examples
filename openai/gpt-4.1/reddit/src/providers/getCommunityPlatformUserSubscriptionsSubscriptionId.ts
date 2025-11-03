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

export async function getCommunityPlatformUserSubscriptionsSubscriptionId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySubscription> {
  // Fetch the subscription by id
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUnique(
      {
        where: { id: props.subscriptionId },
      },
    );
  if (!subscription) {
    throw new HttpException("Subscription not found", 404);
  }
  // Ownership enforcement
  if (subscription.user_id !== props.user.id) {
    throw new HttpException("Forbidden: Not your subscription", 403);
  }
  // Fetch community summary
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: subscription.community_id },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Fetch notification settings (unique pair per (user_id, community_id))
  const notificationSetting =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.findUnique(
      {
        where: {
          user_id_community_id: {
            user_id: subscription.user_id,
            community_id: subscription.community_id,
          },
        },
      },
    );
  if (!notificationSetting) {
    throw new HttpException("Notification settings not found", 500);
  }
  return {
    id: subscription.id,
    user_id: subscription.user_id,
    community_id: subscription.community_id,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
    },
    notification_settings: {
      id: notificationSetting.id,
      user_id: notificationSetting.user_id,
      community_id: notificationSetting.community_id,
      notification_enabled: notificationSetting.notification_enabled,
      created_at: toISOStringSafe(notificationSetting.created_at),
      updated_at: toISOStringSafe(notificationSetting.updated_at),
    },
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at: subscription.deleted_at
      ? toISOStringSafe(subscription.deleted_at)
      : null,
  };
}
