import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardCitizenActivationStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizenActivationStatus";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCitizenActivationStatusTransformer {
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
  ): Promise<IDiscussionBoardCitizenActivationStatus> {
    return {
      citizenId: input.id,
      isActive: input.deleted_at === null ? true : false,
    };
  }
}
