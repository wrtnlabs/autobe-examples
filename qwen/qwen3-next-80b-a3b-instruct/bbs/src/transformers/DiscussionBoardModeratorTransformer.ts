import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModeratorTransformer {
  export type Payload = Prisma.discussion_board_moderatorGetPayload<
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
        user: true,
        discussion_board_moderation_logs: true,
        discussion_board_authentication_logs: true,
        discussion_board_activity_logs: true,
        discussion_board_moderator_sessions: true,
        discussion_board_article_publication_log: true,
        discussion_board_comment_mod_actions: true,
        discussion_board_reports: true,
        discussion_board_moderation_actions: true,
        discussion_board_bans: true,
        discussion_board_appeals: true,
        discussion_board_moderator_actions: true,
        discussion_board_notification_preferences: true,
        discussion_board_audit_events: true,
        discussion_board_compliance_records: true,
      },
    } satisfies Prisma.discussion_board_moderatorFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerator> {
    // Get the most recent moderator action
    const latestAction = input.discussion_board_moderator_actions
      .slice() // create a copy to avoid mutation
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime()) // sort by created_at descending
      .at(0); // get the most recent
    // Use the status from the latest action, or 'active' if no actions exist
    const status = latestAction ? latestAction.status : "active";
    return {
      status: status satisfies "active" | "suspended" | "restricted" as
        | "active"
        | "suspended"
        | "restricted",
    };
  }
}
