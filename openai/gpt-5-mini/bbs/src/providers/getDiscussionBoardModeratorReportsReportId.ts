import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReport> {
  const { moderator, reportId } = props;

  try {
    // Fetch the report by primary key
    const record = await MyGlobal.prisma.discussion_board_reports.findUnique({
      where: { id: reportId },
    });

    if (!record) {
      throw new HttpException("Not Found", 404);
    }

    // Audit the read access for moderator triage (append-only)
    try {
      const auditId = v4();
      await MyGlobal.prisma.discussion_board_moderation_audit.create({
        data: {
          id: auditId,
          moderation_action_id: null,
          report_id: record.id,
          actor_moderator_id: moderator.id,
          event_type: "report.viewed",
          event_payload: JSON.stringify({
            report_id: record.id,
            moderator_id: moderator.id,
            reporter_session_id: record.reporter_session_id ?? null,
          }),
          // Use report.created_at as timestamp source to avoid creating new Date()
          occurred_at: toISOStringSafe(record.created_at),
        },
      });
    } catch (auditError) {
      // Audit failure should not block the main response, but log and continue
      // If Prisma is unavailable, surface a 503 with correlation id
      if (
        auditError instanceof Prisma.PrismaClientKnownRequestError ||
        auditError instanceof Error
      ) {
        const correlationId = v4();
        // Attempt to write to global logs where available
        try {
          // Best-effort: if MyGlobal has logging, use it; otherwise ignore
          if (
            (MyGlobal as any).logger &&
            typeof (MyGlobal as any).logger.error === "function"
          ) {
            (MyGlobal as any).logger.error(
              `Audit logging failed (${correlationId})`,
              auditError,
            );
          }
        } catch (e) {
          // noop
        }
      }
    }

    // Validate and strip tags for primitive enum/literal properties
    const reason_category = typia.assert<IDiscussionBoardReportReasonCategory>(
      record.reason_category,
    );
    const status = typia.assert<IDiscussionBoardReportStatus>(record.status);

    // Build API response mapping Prisma result to DTO
    const result = {
      id: record.id,
      reporter_member_id: record.reporter_member_id,
      // reporter_session_id is optional+nullable in DTO - return null when DB null
      reporter_session_id: record.reporter_session_id ?? null,
      target_type: record.target_type,
      target_id: record.target_id,
      reason_category,
      explanation: record.explanation ?? null,
      status,
      created_at: toISOStringSafe(record.created_at),
      processed_at: record.processed_at
        ? toISOStringSafe(record.processed_at)
        : null,
      closed_at: record.closed_at ? toISOStringSafe(record.closed_at) : null,
    } satisfies IDiscussionBoardReport;

    return result;
  } catch (error) {
    // Known HttpException should be rethrown
    if (error instanceof HttpException) throw error;

    // Prisma transient or unexpected error -> surface 503 with correlation id
    const correlationId = v4();
    // Attempt to log error
    try {
      if (
        (MyGlobal as any).logger &&
        typeof (MyGlobal as any).logger.error === "function"
      ) {
        (MyGlobal as any).logger.error(
          `getDiscussionBoardModeratorReportsReportId failed (${correlationId})`,
          error,
        );
      }
    } catch (e) {
      // noop
    }

    throw new HttpException(`Service Unavailable: ${correlationId}`, 503);
  }
}
