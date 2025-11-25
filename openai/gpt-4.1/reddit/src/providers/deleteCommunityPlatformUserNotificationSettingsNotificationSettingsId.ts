import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserNotificationSettingsNotificationSettingsId(props: {
  user: UserPayload;
  notificationSettingsId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Lookup the notification settings record by id
  const record =
    await MyGlobal.prisma.community_platform_notification_settings.findUnique({
      where: { id: props.notificationSettingsId },
    });

  if (!record) {
    throw new HttpException("Notification settings not found", 404);
  }

  // Allow deletion only for owners (community_platform_user_id == props.user.id)
  if (record.community_platform_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete these notification settings",
      403,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.community_platform_notification_settings.delete({
    where: { id: props.notificationSettingsId },
  });
  // TODO: Implement audit logging when audit log schema is available
}
