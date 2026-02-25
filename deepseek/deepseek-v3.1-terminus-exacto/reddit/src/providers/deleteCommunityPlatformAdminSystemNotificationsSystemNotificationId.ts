import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminSystemNotificationsSystemNotificationId(props: {
  admin: AdminPayload;
  systemNotificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify notification exists before attempting deletion
  await MyGlobal.prisma.community_platform_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.systemNotificationId },
    },
  );
  // Delete the notification - cascade constraints will handle related records
  await MyGlobal.prisma.community_platform_system_notifications.delete({
    where: { id: props.systemNotificationId },
  });
}
