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

export async function postCommunityPlatformUserSubscriptions(props: {
  user: UserPayload;
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  // 1. Verify community existence and active status (not deleted)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException(
      "Community does not exist or has been deleted",
      404,
    );
  }

  // 2. Check for duplicate (active) subscription (no soft-deleted reuse)
  const existing =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        user_id: props.user.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (existing) {
    throw new HttpException("Already subscribed to this community", 409);
  }

  // 3. Insert subscription row
  const now = toISOStringSafe(new Date());
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.create({
      data: {
        id: v4(),
        user_id: props.user.id,
        community_id: props.body.community_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 4. Insert the notification settings row (enabled by default, unless specified)
  const notification =
    await MyGlobal.prisma.community_platform_community_subscription_notifications.create(
      {
        data: {
          id: v4(),
          user_id: props.user.id,
          community_id: props.body.community_id,
          notification_enabled:
            props.body.notification_enabled !== undefined
              ? props.body.notification_enabled
              : true,
          created_at: now,
          updated_at: now,
        },
      },
    );

  // 5. Compose the community summary DTO
  const summary = {
    id: community.id,
    name: community.name,
    description: community.description,
  };

  // 6. Return the final subscription DTO
  return {
    id: subscription.id,
    user_id: subscription.user_id,
    community_id: subscription.community_id,
    community: summary,
    notification_settings: {
      ...notification,
      created_at: toISOStringSafe(notification.created_at),
      updated_at: toISOStringSafe(notification.updated_at),
    },
    created_at: toISOStringSafe(subscription.created_at),
    updated_at: toISOStringSafe(subscription.updated_at),
    deleted_at: null,
  };
}
