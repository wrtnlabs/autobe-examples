import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getDiscussionBoardMemberNotificationPreferencesPreferenceId(props: {
  member: MemberPayload;
  preferenceId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardNotificationPreference> {
  // Find the notification preference by ID
  const preference =
    await MyGlobal.prisma.discussion_board_notification_preferences.findUnique({
      where: {
        id: props.preferenceId,
      },
    });

  // Check if preference exists
  if (!preference) {
    throw new HttpException(
      "Notification preference configuration not found",
      404,
    );
  }

  // Verify the preference belongs to the authenticated member
  if (preference.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You do not have permission to access this notification preference",
      403,
    );
  }

  // Convert and return the preference with proper typing
  return {
    id: preference.id,
    discussion_board_member_id: preference.discussion_board_member_id,
    email_notifications: preference.email_notifications,
    in_app_notifications: preference.in_app_notifications,
    post_interactions: preference.post_interactions,
    comment_replies: preference.comment_replies,
    moderation_updates: preference.moderation_updates,
    system_announcements: preference.system_announcements,
    frequency: typia.assert<"immediate" | "daily_digest" | "weekly_digest">(
      preference.frequency,
    ),
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
  };
}
