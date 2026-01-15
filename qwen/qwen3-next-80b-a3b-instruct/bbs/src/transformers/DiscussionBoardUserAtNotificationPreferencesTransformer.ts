import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserAtNotificationPreferencesTransformer {
  export type Payload = Prisma.discussion_board_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussion_board_posts: true,
        discussion_board_moderator: true,
        discussion_board_comment_notifications: true,
        discussion_board_attachment_files: true,
        discussion_board_notification_records: true,
        discussion_board_security_logs: true,
      },
    } satisfies Prisma.discussion_board_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUser.INotificationPreferences> {
    // Extract notification preferences from JSON column
    const prefs = input.notification_preferences;
    return {
      enabled: prefs?.enabled ?? false,
      email_notifications: prefs?.email_notifications ?? false,
      push_notifications: prefs?.push_notifications ?? false,
      in_app_notifications: prefs?.in_app_notifications ?? false,
      daily_digest: prefs?.daily_digest ?? false,
      weekly_summary: prefs?.weekly_summary ?? false,
      moderation_alerts: prefs?.moderation_alerts ?? false,
      comment_replies: prefs?.comment_replies ?? false,
      article_comments: prefs?.article_comments ?? false,
      following_activity: prefs?.following_activity ?? false,
      direct_messages: prefs?.direct_messages ?? false,
      admin_updates: prefs?.admin_updates ?? false,
      security_alerts: prefs?.security_alerts ?? false,
      api_access: prefs?.api_access ?? false,
    };
  }
}
