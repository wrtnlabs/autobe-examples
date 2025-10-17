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

export async function getDiscussionBoardMemberUsersUserIdNotificationPreferences(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember.INotificationPreferences> {
  const { member, userId } = props;

  // Authorization: verify authenticated member is accessing their own preferences
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own notification preferences",
      403,
    );
  }

  // Retrieve notification preferences for the user
  const preferences =
    await MyGlobal.prisma.discussion_board_notification_preferences.findUniqueOrThrow(
      {
        where: {
          user_id: userId,
        },
      },
    );

  // Convert to DTO format with proper date string conversion
  return {
    id: preferences.id as string & tags.Format<"uuid">,
    user_id: preferences.user_id as string & tags.Format<"uuid">,
    reply_to_topic_in_app: preferences.reply_to_topic_in_app,
    reply_to_topic_email: preferences.reply_to_topic_email,
    reply_to_comment_in_app: preferences.reply_to_comment_in_app,
    reply_to_comment_email: preferences.reply_to_comment_email,
    mention_in_app: preferences.mention_in_app,
    mention_email: preferences.mention_email,
    vote_milestone_in_app: preferences.vote_milestone_in_app,
    vote_milestone_email: preferences.vote_milestone_email,
    moderation_action_in_app: preferences.moderation_action_in_app,
    moderation_action_email: preferences.moderation_action_email,
    watched_topic_in_app: preferences.watched_topic_in_app,
    watched_topic_email: preferences.watched_topic_email,
    system_announcement_in_app: preferences.system_announcement_in_app,
    system_announcement_email: preferences.system_announcement_email,
    digest_frequency: preferences.digest_frequency as
      | "realtime"
      | "hourly"
      | "daily"
      | "weekly",
    quiet_hours_enabled: preferences.quiet_hours_enabled,
    quiet_hours_start: preferences.quiet_hours_start ?? undefined,
    quiet_hours_end: preferences.quiet_hours_end ?? undefined,
    timezone: preferences.timezone,
    created_at: toISOStringSafe(preferences.created_at),
    updated_at: toISOStringSafe(preferences.updated_at),
  };
}
