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

export async function putDiscussionBoardMemberNotificationPreferencesPreferenceId(props: {
  member: MemberPayload;
  preferenceId: string & tags.Format<"uuid">;
  body: IDiscussionBoardNotificationPreference.IUpdate;
}): Promise<IDiscussionBoardNotificationPreference> {
  // Verify the preference exists and belongs to the authenticated member
  const existingPreference =
    await MyGlobal.prisma.discussion_board_notification_preferences.findUnique({
      where: { id: props.preferenceId },
    });

  if (!existingPreference) {
    throw new HttpException("Notification preference not found", 404);
  }

  if (existingPreference.discussion_board_member_id !== props.member.id) {
    throw new HttpException(
      "You can only update your own notification preferences",
      403,
    );
  }

  const updatedPreference =
    await MyGlobal.prisma.discussion_board_notification_preferences.update({
      where: { id: props.preferenceId },
      data: {
        ...(props.body.email_notifications !== undefined && {
          email_notifications: props.body.email_notifications,
        }),
        ...(props.body.in_app_notifications !== undefined && {
          in_app_notifications: props.body.in_app_notifications,
        }),
        ...(props.body.post_interactions !== undefined && {
          post_interactions: props.body.post_interactions,
        }),
        ...(props.body.comment_replies !== undefined && {
          comment_replies: props.body.comment_replies,
        }),
        ...(props.body.moderation_updates !== undefined && {
          moderation_updates: props.body.moderation_updates,
        }),
        ...(props.body.system_announcements !== undefined && {
          system_announcements: props.body.system_announcements,
        }),
        ...(props.body.frequency !== undefined && {
          frequency: props.body.frequency,
        }),
        updated_at: new Date(),
      },
    });

  return {
    id: updatedPreference.id,
    discussion_board_member_id: updatedPreference.discussion_board_member_id,
    email_notifications: updatedPreference.email_notifications,
    in_app_notifications: updatedPreference.in_app_notifications,
    post_interactions: updatedPreference.post_interactions,
    comment_replies: updatedPreference.comment_replies,
    moderation_updates: updatedPreference.moderation_updates,
    system_announcements: updatedPreference.system_announcements,
    frequency: typia.assert<"immediate" | "daily_digest" | "weekly_digest">(
      updatedPreference.frequency,
    ),
    created_at: toISOStringSafe(updatedPreference.created_at),
    updated_at: toISOStringSafe(updatedPreference.updated_at),
  };
}
