import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationLogTransformer {
  export type Payload = Prisma.discussion_board_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: {
          select: {
            id: true,
          },
        },
        targetRecord: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationLog> {
    return {
      actionType: input.action_type as
        | "warning"
        | "removal"
        | "suspension"
        | "ban"
        | "other",
      reasonCode: input.reason as
        | "spam"
        | "harassment"
        | "hate_speech"
        | "impersonation"
        | "copyright_violation"
        | "other",
      customReason: undefined,
      status: undefined,
      resolutionDetails: undefined,
      targetType: "other", // Fixed: Matches allowed literal type "article" | "comment" | "other" | "user_profile" | "attachment"
      source: "human_moderator", // Fixed: Matches allowed literal type "human_moderator" | "automated_system" | "third_party_service" | "content_flagger"
      escalated: undefined,
      appealStatus: undefined,
      appealDeadline: undefined,
      relatedReportIds: undefined,
      notificationSent: undefined,
      actionDuration: 0,
      isArchived: undefined,
      archivedTimestamp: undefined,
      auditTrailHash: undefined,
      relatedModerationLogId: undefined,
      totalViolationsCount: undefined,
      severityLevel: undefined,
      ipAddress: undefined,
      userAgent: undefined,
      location: undefined,
      moderationTool: undefined,
      workflowVersion: undefined,
      policyVersion: undefined,
      moderatorTeam: undefined,
      reviewedInAudit: undefined,
      auditReferenceNumber: undefined,
      regulatoryComplianceId: undefined,
      dataRetentionCategory: undefined,
      retentionPeriodMonths: undefined,
      legalHold: undefined,
      legalHoldReason: undefined,
      legalHoldExpiryDate: undefined,
      digitalSignature: undefined,
      digitalSignatureAlgorithm: undefined,
      digitalSignatureCertificate: undefined,
      complianceCategory: undefined,
      externalAuditId: undefined,
      moderatorNotes: undefined,
      systemGenerated: false,
      sourceSystem: "",
      actionCategory: "other",
      actorId: input.moderator.id,
      targetId: input.targetRecord.id,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: input.updated_at
        ? toISOStringSafe(input.updated_at)
        : undefined,
    };
  }
}
