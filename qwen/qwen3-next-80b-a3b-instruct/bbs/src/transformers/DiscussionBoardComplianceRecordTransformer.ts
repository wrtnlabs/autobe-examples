import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceRecord";
import { IComplianceRecordType } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordType";
import { IComplianceRecordStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordStatus";
import { IComplianceRecordActionTaken } from "@ORGANIZATION/PROJECT-api/lib/structures/IComplianceRecordActionTaken";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardComplianceRecordTransformer {
  export type Payload = Prisma.discussion_board_compliance_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason_code: true,
        original_data: true,
        content_type: true,
        created_at: true,
        updated_at: true,
        actor_type: true,
        moderator: {
          select: {
            id: true,
          },
        },
        citizen: {
          select: {
            id: true,
          },
        },
        article: {
          select: {
            id: true,
          },
        },
        comment: {
          select: {
            id: true,
          },
        },
        report: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_compliance_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardComplianceRecord> {
    return {
      id: input.id,
      record_type: input.action_type as IComplianceRecordType,
      action_id: input.report ? input.report.id : undefined,
      reported_content_id: input.article
        ? input.article.id
        : input.comment
          ? input.comment.id
          : undefined,
      reporter_id: input.citizen ? input.citizen.id : undefined,
      moderator_id: input.moderator ? input.moderator.id : undefined,
      status:
        input.action_type === "MODERATOR_ACTION" ||
        input.action_type === "APPEAL"
          ? "RESOLVED"
          : "PENDING_REVIEW",
      violation_category: input.reason_code,
      violation_subcategory: input.original_data,
      severity_level:
        input.action_type === "USER_REPORT"
          ? 2
          : input.action_type === "MODERATOR_ACTION"
            ? 5
            : input.action_type === "SYSTEM_TRIGGER"
              ? 3
              : 1,
      action_taken:
        input.action_type === "USER_REPORT"
          ? "NONE"
          : input.action_type === "MODERATOR_ACTION"
            ? "CONTENT_REMOVAL"
            : input.action_type === "SYSTEM_TRIGGER"
              ? "WARNING"
              : "NONE",
      action_details: input.reason_code + " - " + input.original_data,
      timestamp: input.created_at.toISOString(),
      appeal_count: 0,
      related_report_ids: [],
      evidence_links: [],
      policy_violated:
        input.reason_code === "HARASSMENT"
          ? "Section 3.2: Prohibition of hate speech"
          : input.reason_code === "SPAM"
            ? "Section 5.1: Copyright infringement"
            : input.reason_code === "INAPPROPRIATE_CONTENT"
              ? "Section 7.4: Harassment of moderators"
              : "Unknown policy violation",
      resolution_notes:
        "Record created from " +
        input.action_type +
        " with reason: " +
        input.reason_code,
    };
  }
}
