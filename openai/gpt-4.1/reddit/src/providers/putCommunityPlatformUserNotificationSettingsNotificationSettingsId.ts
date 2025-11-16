import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSettings";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserNotificationSettingsNotificationSettingsId(props: {
  user: UserPayload;
  notificationSettingsId: string & tags.Format<"uuid">;
  body: ICommunityPlatformNotificationSettings.IUpdate;
}): Promise<ICommunityPlatformNotificationSettings> {
  const settings =
    await MyGlobal.prisma.community_platform_notification_settings.findUnique({
      where: {
        id: props.notificationSettingsId,
      },
      include: {
        user: true,
      },
    });

  if (!settings || settings.deleted_at !== null) {
    throw new HttpException("Notification settings not found.", 404);
  }

  if (settings.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden. You can only update your own notification settings.",
      403,
    );
  }

  const updates = {
    email_notifications_enabled: props.body.email_notifications_enabled,
    push_notifications_enabled: props.body.push_notifications_enabled,
    mentions_alerts_enabled: props.body.mentions_alerts_enabled,
    activity_notifications_enabled: props.body.activity_notifications_enabled,
    moderator_alerts_enabled: props.body.moderator_alerts_enabled,
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.community_platform_notification_settings.update({
      where: {
        id: props.notificationSettingsId,
      },
      data: updates,
      include: {
        user: true,
      },
    });

  return {
    id: updated.id,
    user: {
      id: updated.user.id,
    },
    email_notifications_enabled: updated.email_notifications_enabled,
    push_notifications_enabled: updated.push_notifications_enabled,
    mentions_alerts_enabled: updated.mentions_alerts_enabled,
    activity_notifications_enabled: updated.activity_notifications_enabled,
    moderator_alerts_enabled: updated.moderator_alerts_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
