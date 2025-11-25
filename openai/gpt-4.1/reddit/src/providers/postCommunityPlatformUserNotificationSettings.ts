import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityPlatformUserNotificationSettings(props: {
  user: UserPayload;
  body: ICommunityPlatformNotificationSettings.ICreate;
}): Promise<ICommunityPlatformNotificationSettings> {
  // 1. Check uniqueness: only one settings record per user (not soft-deleted)
  const existing =
    await MyGlobal.prisma.community_platform_notification_settings.findFirst({
      where: {
        community_platform_user_id: props.user.id,
        deleted_at: null,
      },
    });

  if (existing) {
    throw new HttpException(
      "Notification settings already exist for this user. Use PUT to update.",
      409,
    );
  }

  // 2. Create the notification settings record (all boolean props required)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_notification_settings.create({
      data: {
        id: v4(),
        community_platform_user_id: props.user.id,
        email_notifications_enabled: props.body.email_notifications_enabled,
        push_notifications_enabled: props.body.push_notifications_enabled,
        mentions_alerts_enabled: props.body.mentions_alerts_enabled,
        activity_notifications_enabled:
          props.body.activity_notifications_enabled,
        moderator_alerts_enabled: props.body.moderator_alerts_enabled,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // 3. Return API DTO (map user summary as { id })
  return {
    id: created.id,
    user: { id: created.community_platform_user_id },
    email_notifications_enabled: created.email_notifications_enabled,
    push_notifications_enabled: created.push_notifications_enabled,
    mentions_alerts_enabled: created.mentions_alerts_enabled,
    activity_notifications_enabled: created.activity_notifications_enabled,
    moderator_alerts_enabled: created.moderator_alerts_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null || created.deleted_at === undefined
        ? null
        : toISOStringSafe(created.deleted_at),
  };
}
