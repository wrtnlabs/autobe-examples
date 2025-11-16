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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorNotificationSettingsNotificationSettingsId(props: {
  administrator: AdministratorPayload;
  notificationSettingsId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformNotificationSettings> {
  const record =
    await MyGlobal.prisma.community_platform_notification_settings.findUnique({
      where: { id: props.notificationSettingsId },
      include: { user: true },
    });

  if (!record) {
    throw new HttpException("Notification settings not found", 404);
  }

  return {
    id: record.id,
    user: { id: record.user.id },
    email_notifications_enabled: record.email_notifications_enabled,
    push_notifications_enabled: record.push_notifications_enabled,
    mentions_alerts_enabled: record.mentions_alerts_enabled,
    activity_notifications_enabled: record.activity_notifications_enabled,
    moderator_alerts_enabled: record.moderator_alerts_enabled,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
