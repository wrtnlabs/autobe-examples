import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IDiscussionBoardSystemNotificationOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemNotificationOfAdminTransformer } from "../transformers/DiscussionBoardSystemNotificationOfAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getDiscussionBoardAdminSystemNotificationsNotificationIdSubtypesSubtypeId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  subtypeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemNotificationOfAdmin> {
  // First verify the parent notification exists
  await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
    {
      where: { id: props.notificationId },
      select: { id: true },
    },
  );
  // Query the admin-specific subtype with proper relationship validation
  const subtype =
    await MyGlobal.prisma.discussion_board_system_notification_of_admins.findUnique(
      {
        where: {
          id: props.subtypeId,
          discussion_board_system_notification_id: props.notificationId,
          discussion_board_admin_id: props.admin.id,
        },
        ...DiscussionBoardSystemNotificationOfAdminTransformer.select(),
      },
    );
  if (!subtype) {
    throw new HttpException(
      "Notification subtype not found or access denied",
      404,
    );
  }
  return await DiscussionBoardSystemNotificationOfAdminTransformer.transform(
    subtype,
  );
}
