import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModeratorAtSummaryTransformer {
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
  ): Promise<IDiscussionBoardModerator.ISummary> {
    // Find the latest login time from authentication logs
    const lastLoginTime =
      input.discussion_board_authentication_logs.length > 0
        ? input.discussion_board_authentication_logs.reduce(
            (max, log) => (log.created_at > max ? log.created_at : max),
            new Date(0),
          )
        : input.created_at;
    return {
      id: input.id,
      role: "staff", // Constant fallback since role not in schema
      email: input.email,
      assignedAt: input.created_at.toISOString(), // Map to created_at
      isActive: input.deleted_at === null, // Active if not deleted
      lastActiveAt: input.updated_at.toISOString(), // Map to updated_at
      lastLoginAt: lastLoginTime.toISOString(), // Max of authentication logs or created_at
      isVerified: true, // Constant true to satisfy interface requirement
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
