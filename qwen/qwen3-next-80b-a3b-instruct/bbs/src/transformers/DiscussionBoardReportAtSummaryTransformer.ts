import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardReportAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_id: true,
        reason: true,
        report_state: true,
        created_at: true,
        target_type: true,
        updated_at: true,
        deleted_at: true,
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
  ): Promise<IDiscussionBoardReport.ISummary> {
    return {
      id: input.id,
      reported_content_id: input.target_id,
      report_reason: input.reason,
      status: input.report_state satisfies string as
        | "pending"
        | "resolved"
        | "reviewed"
        | "dismissed",
      created_at: toISOStringSafe(input.created_at),
      type: input.target_type satisfies string as
        | "article"
        | "comment"
        | "attachment",
      severity: 2,
      reporter_anonymized: true,
    };
  }
}
