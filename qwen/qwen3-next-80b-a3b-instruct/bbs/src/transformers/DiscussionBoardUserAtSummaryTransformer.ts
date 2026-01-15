import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_citizenGetPayload<
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
        discussion_board_authentication_logs: true,
        discussion_board_activity_logs: true,
        discussion_board_citizen_sessions: true,
        discussion_board_articles: true,
        discussion_board_article_reports: true,
        discussion_board_article_comments: true,
        discussion_board_article_status_logs: true,
        discussion_board_comments: true,
        discussion_board_comment_replies: true,
        discussion_board_comment_votes: true,
        discussion_board_attachment_images: true,
        discussion_board_reports: true,
        discussion_board_warnings: true,
        discussion_board_suspensions: true,
        discussion_board_bans: true,
        discussion_board_appeals: true,
        discussion_board_citizen_violations: true,
        discussion_board_citizen_trust_scores: true,
        discussion_board_citizen_suspensions: true,
        discussion_board_notification_preferences: true,
        discussion_board_audit_events: true,
        discussion_board_compliance_records: true,
      },
    } satisfies Prisma.discussion_board_citizenFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUser.ISummary> {
    let status: "active" | "suspended" | "banned" = "active";
    if (input.deleted_at !== null) {
      status = "banned";
    } else if (input.discussion_board_suspensions.length > 0) {
      status = "suspended";
    } else if (input.discussion_board_bans.length > 0) {
      status = "banned";
    }
    return {
      id: input.id,
      username: input.email,
      registration_date: input.created_at.toISOString(),
      status,
    };
  }
}
