import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserNotificationsAdminUserPreferences(props: {
  adminUser: AdminuserPayload;
  body: IDiscussionBoardAdminuserNotificationPreference.IUpdate;
}): Promise<IDiscussionBoardAdminuserNotificationPreference> {
  const adminUserId = props.adminUser.id;
  const body = props.body;

  const now = new Date();
  const nowIso = toISOStringSafe(now);

  const record =
    await MyGlobal.prisma.discussion_board_adminuser_notification_preferences.upsert(
      {
        where: {
          discussion_board_adminuser_id: adminUserId,
        },
        update: {
          ...(body.activity_notifications_enabled !== undefined && {
            activity_notifications_enabled: body.activity_notifications_enabled,
          }),
          ...(body.digest_notifications_enabled !== undefined && {
            digest_notifications_enabled: body.digest_notifications_enabled,
          }),
          ...(body.marketing_notifications_enabled !== undefined && {
            marketing_notifications_enabled:
              body.marketing_notifications_enabled,
          }),
          updated_at: nowIso,
        },
        create: {
          id: v4(),
          discussion_board_adminuser_id: adminUserId,
          activity_notifications_enabled:
            body.activity_notifications_enabled !== undefined
              ? body.activity_notifications_enabled
              : false,
          digest_notifications_enabled:
            body.digest_notifications_enabled !== undefined
              ? body.digest_notifications_enabled
              : false,
          marketing_notifications_enabled:
            body.marketing_notifications_enabled !== undefined
              ? body.marketing_notifications_enabled
              : false,
          created_at: nowIso,
          updated_at: nowIso,
        },
      },
    );

  if (!record) {
    throw new HttpException(
      "Failed to upsert admin notification preferences",
      500,
    );
  }

  return {
    id: record.id,
    activity_notifications_enabled: record.activity_notifications_enabled,
    digest_notifications_enabled: record.digest_notifications_enabled,
    marketing_notifications_enabled: record.marketing_notifications_enabled,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
