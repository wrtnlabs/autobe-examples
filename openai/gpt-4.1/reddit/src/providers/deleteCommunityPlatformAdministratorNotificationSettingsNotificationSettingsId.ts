import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorNotificationSettingsNotificationSettingsId(props: {
  administrator: AdministratorPayload;
  notificationSettingsId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Lookup the notification settings record by id
  const record =
    await MyGlobal.prisma.community_platform_notification_settings.findUnique({
      where: { id: props.notificationSettingsId },
    });

  if (!record) {
    throw new HttpException("Notification settings not found.", 404);
  }

  // Hard delete the notification settings record
  await MyGlobal.prisma.community_platform_notification_settings.delete({
    where: { id: props.notificationSettingsId },
  });

  // AUDIT LOGGING
  // Normally, we'd insert a row in a dedicated audit log table. This is not available in loaded schema.
  // Example (pseudo-code):
  // await MyGlobal.prisma.community_platform_notification_setting_audit_logs.create({
  //   data: {
  //     id: v4(),
  //     notification_settings_id: props.notificationSettingsId,
  //     actor_administrator_id: props.administrator.id,
  //     event: 'DELETE',
  //     occurred_at: toISOStringSafe(new Date()),
  //   }
  // });
  // --- End Audit Logging Stub ---
}
