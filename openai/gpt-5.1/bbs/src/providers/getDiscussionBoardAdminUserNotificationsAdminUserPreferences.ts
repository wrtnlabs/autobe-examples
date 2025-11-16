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

export async function getDiscussionBoardAdminUserNotificationsAdminUserPreferences(props: {
  adminUser: AdminuserPayload;
}): Promise<IDiscussionBoardAdminuserNotificationPreference> {
  // Attempt to load existing notification preferences for this admin user
  const existing =
    await MyGlobal.prisma.discussion_board_adminuser_notification_preferences.findFirst(
      {
        where: {
          discussion_board_adminuser_id: props.adminUser.id,
        },
      },
    );

  if (existing !== null) {
    return {
      id: existing.id,
      activity_notifications_enabled: existing.activity_notifications_enabled,
      digest_notifications_enabled: existing.digest_notifications_enabled,
      marketing_notifications_enabled: existing.marketing_notifications_enabled,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  }

  // Lazily create a default preference record when none exists yet.
  // Defaults: enable all notification categories so that admins receive updates
  // unless they explicitly opt out via the update endpoint.
  const now = new Date();
  const created =
    await MyGlobal.prisma.discussion_board_adminuser_notification_preferences.create(
      {
        data: {
          id: v4(),
          discussion_board_adminuser_id: props.adminUser.id,
          activity_notifications_enabled: true,
          digest_notifications_enabled: true,
          marketing_notifications_enabled: true,
          created_at: toISOStringSafe(now),
          updated_at: toISOStringSafe(now),
        },
      },
    );

  return {
    id: created.id,
    activity_notifications_enabled: created.activity_notifications_enabled,
    digest_notifications_enabled: created.digest_notifications_enabled,
    marketing_notifications_enabled: created.marketing_notifications_enabled,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
