import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

export async function putDiscussionBoardMemberNotificationPreferencesMemberId(props: {
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotificationPreference.IUpdate;
}): Promise<IDiscussionBoardNotificationPreference> {
  // Verify the notification preference exists and belongs to the member
  const existing =
    await MyGlobal.prisma.discussion_board_notification_preferences.findFirst({
      where: {
        discussion_board_member_id: props.memberId,
      },
    });

  if (!existing) {
    throw new HttpException(
      "Notification preferences not found for this member",
      404,
    );
  }

  // Update the preference with provided settings
  const updated =
    await MyGlobal.prisma.discussion_board_notification_preferences.update({
      where: { id: existing.id },
      data: {
        ...props.body,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return the updated preference with proper date conversion
  return {
    id: updated.id,
    discussion_board_member_id: updated.discussion_board_member_id,
    email_notifications: updated.email_notifications,
    in_app_notifications: updated.in_app_notifications,
    post_interactions: updated.post_interactions,
    comment_replies: updated.comment_replies,
    moderation_updates: updated.moderation_updates,
    system_announcements: updated.system_announcements,
    frequency: typia.assert<"immediate" | "daily_digest" | "weekly_digest">(
      updated.frequency,
    ),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
