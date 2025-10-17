import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberUsersUserIdNotificationPreferences(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.INotificationPreferences.IUpdate;
}): Promise<IDiscussionBoardMember.INotificationPreferences> {
  const { member, userId, body } = props;

  // Authorization: Ensure member can only update their own preferences
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only update your own notification preferences",
      403,
    );
  }

  // Verify preferences record exists for this user
  const existing =
    await MyGlobal.prisma.discussion_board_notification_preferences.findFirst({
      where: { user_id: userId },
    });

  if (!existing) {
    throw new HttpException(
      "Notification preferences not found for this user",
      404,
    );
  }

  // Build update data with only provided fields
  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.discussion_board_notification_preferences.update({
      where: { user_id: userId },
      data: {
        reply_to_topic_in_app: body.reply_to_topic_in_app ?? undefined,
        reply_to_topic_email: body.reply_to_topic_email ?? undefined,
        reply_to_comment_in_app: body.reply_to_comment_in_app ?? undefined,
        reply_to_comment_email: body.reply_to_comment_email ?? undefined,
        mention_in_app: body.mention_in_app ?? undefined,
        mention_email: body.mention_email ?? undefined,
        vote_milestone_in_app: body.vote_milestone_in_app ?? undefined,
        vote_milestone_email: body.vote_milestone_email ?? undefined,
        moderation_action_in_app: body.moderation_action_in_app ?? undefined,
        moderation_action_email: body.moderation_action_email ?? undefined,
        watched_topic_in_app: body.watched_topic_in_app ?? undefined,
        watched_topic_email: body.watched_topic_email ?? undefined,
        system_announcement_in_app:
          body.system_announcement_in_app ?? undefined,
        system_announcement_email: body.system_announcement_email ?? undefined,
        digest_frequency: body.digest_frequency ?? undefined,
        quiet_hours_enabled: body.quiet_hours_enabled ?? undefined,
        quiet_hours_start:
          body.quiet_hours_start === undefined
            ? undefined
            : body.quiet_hours_start,
        quiet_hours_end:
          body.quiet_hours_end === undefined ? undefined : body.quiet_hours_end,
        timezone: body.timezone ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    user_id: updated.user_id,
    reply_to_topic_in_app: updated.reply_to_topic_in_app,
    reply_to_topic_email: updated.reply_to_topic_email,
    reply_to_comment_in_app: updated.reply_to_comment_in_app,
    reply_to_comment_email: updated.reply_to_comment_email,
    mention_in_app: updated.mention_in_app,
    mention_email: updated.mention_email,
    vote_milestone_in_app: updated.vote_milestone_in_app,
    vote_milestone_email: updated.vote_milestone_email,
    moderation_action_in_app: updated.moderation_action_in_app,
    moderation_action_email: updated.moderation_action_email,
    watched_topic_in_app: updated.watched_topic_in_app,
    watched_topic_email: updated.watched_topic_email,
    system_announcement_in_app: updated.system_announcement_in_app,
    system_announcement_email: updated.system_announcement_email,
    digest_frequency: updated.digest_frequency as
      | "realtime"
      | "hourly"
      | "daily"
      | "weekly",
    quiet_hours_enabled: updated.quiet_hours_enabled,
    quiet_hours_start:
      updated.quiet_hours_start === null ? null : updated.quiet_hours_start,
    quiet_hours_end:
      updated.quiet_hours_end === null ? null : updated.quiet_hours_end,
    timezone: updated.timezone,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
