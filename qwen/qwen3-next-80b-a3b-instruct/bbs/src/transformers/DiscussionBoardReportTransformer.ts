import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardReportTransformer {
  export type Payload = Prisma.discussion_board_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report_state: true,
        reporter: true,
        moderatorReporter: true,
        discussion_board_moderation_actions: true,
        discussion_board_appeals: true,
        discussion_board_moderation_audit_trails: true,
        discussion_board_notification_records: true,
        discussion_board_compliance_records: true,
      },
    } satisfies Prisma.discussion_board_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardReport> {
    return {
      id: input.id,
      reporter_id: input.reporter?.id ?? "00000000-0000-0000-0000-000000000000",
      target_article_id:
        input.target_type === "article" ? input.target_id : undefined,
      target_comment_id:
        input.target_type === "comment" ? input.target_id : undefined,
      target_content_type: input.target_type as "article" | "comment",
      report_type: input.reason as
        | "spam"
        | "harassment"
        | "hate_speech"
        | "violence"
        | "illegal"
        | "inappropriate"
        | "impersonation"
        | "copyright"
        | "other",
      created_at: toISOStringSafe(input.created_at),
      status: input.report_state as
        | "pending"
        | "reviewed"
        | "dismissed"
        | "confirmed"
        | "resolved",
    };
  }
}
