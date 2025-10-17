import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconPoliticalForumModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumReport.IUpdate;
}): Promise<IEconPoliticalForumReport> {
  const { moderator, reportId, body } = props;

  // Verify moderator enrollment and active status
  const moderatorRecord =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: {
        registereduser_id: moderator.id,
        deleted_at: null,
        is_active: true,
      },
    });
  if (!moderatorRecord)
    throw new HttpException("Unauthorized: not a moderator", 403);

  // Load existing report
  const existing =
    await MyGlobal.prisma.econ_political_forum_reports.findUnique({
      where: { id: reportId },
    });
  if (!existing) throw new HttpException("Not Found", 404);

  // Optimistic concurrency: if client provided a triaged_at as concurrency token
  if (body.triaged_at !== undefined && body.triaged_at !== null) {
    const currentTriagedAt = existing.triaged_at
      ? toISOStringSafe(existing.triaged_at)
      : null;
    if (currentTriagedAt && body.triaged_at < currentTriagedAt) {
      throw new HttpException("Conflict: report has been modified", 409);
    }
  }

  // Validate enums (business rules)
  const allowedStatuses = [
    "pending",
    "triaged",
    "dismissed",
    "action_taken",
    "escalated",
  ] as const;
  const allowedPriorities = ["low", "normal", "high", "urgent"] as const;

  if (body.status !== undefined && body.status !== null) {
    if (!allowedStatuses.includes(body.status))
      throw new HttpException("Bad Request: invalid status", 400);
  }
  if (body.priority !== undefined && body.priority !== null) {
    if (!allowedPriorities.includes(body.priority))
      throw new HttpException("Bad Request: invalid priority", 400);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedReport = await tx.econ_political_forum_reports.update({
      where: { id: reportId },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.moderation_case_id === null
          ? { moderation_case_id: null }
          : body.moderation_case_id !== undefined
            ? { moderation_case_id: body.moderation_case_id }
            : {}),
        triaged_at:
          body.triaged_at === null
            ? null
            : body.triaged_at !== undefined
              ? toISOStringSafe(body.triaged_at)
              : undefined,
        reviewed_at:
          body.reviewed_at === null
            ? null
            : body.reviewed_at !== undefined
              ? toISOStringSafe(body.reviewed_at)
              : undefined,
        resolved_at:
          body.resolved_at === null
            ? null
            : body.resolved_at !== undefined
              ? toISOStringSafe(body.resolved_at)
              : undefined,
        moderator_id: moderatorRecord.id,
      },
    });

    // Create moderation log when status transitions to action_taken or escalated
    if (
      body.status !== undefined &&
      (body.status === "action_taken" || body.status === "escalated")
    ) {
      await tx.econ_political_forum_moderation_logs.create({
        data: {
          id: v4(),
          moderator_id: moderatorRecord.id,
          target_post_id: updatedReport.reported_post_id ?? null,
          target_thread_id: updatedReport.reported_thread_id ?? null,
          moderation_case_id: updatedReport.moderation_case_id ?? null,
          action_type: body.status,
          reason_code: updatedReport.reason_code,
          rationale: null,
          evidence_reference: null,
          created_at: now,
        },
      });
    }

    // Create audit log for this action
    await tx.econ_political_forum_audit_logs.create({
      data: {
        id: v4(),
        registereduser_id: moderatorRecord.registereduser_id ?? null,
        moderator_id: moderatorRecord.id,
        post_id: updatedReport.reported_post_id ?? null,
        thread_id: updatedReport.reported_thread_id ?? null,
        report_id: updatedReport.id,
        moderation_case_id: updatedReport.moderation_case_id ?? null,
        action_type: body.status ?? "update",
        target_type: "report",
        target_identifier: updatedReport.id,
        details: JSON.stringify({
          before: { status: existing.status, priority: existing.priority },
          after: {
            status: updatedReport.status,
            priority: updatedReport.priority,
          },
        }),
        created_at: now,
        created_by_system: false,
      },
    });

    return updatedReport;
  });

  return {
    id: updated.id,
    reporter_id: updated.reporter_id === null ? null : updated.reporter_id,
    reported_post_id:
      updated.reported_post_id === null ? null : updated.reported_post_id,
    reported_thread_id:
      updated.reported_thread_id === null ? null : updated.reported_thread_id,
    moderator_id: updated.moderator_id === null ? null : updated.moderator_id,
    moderation_case_id:
      updated.moderation_case_id === null ? null : updated.moderation_case_id,
    reason_code: updated.reason_code,
    reporter_text:
      updated.reporter_text === null ? null : updated.reporter_text,
    reporter_anonymous: updated.reporter_anonymous,
    status: updated.status,
    priority: updated.priority,
    created_at: toISOStringSafe(updated.created_at),
    triaged_at: updated.triaged_at
      ? toISOStringSafe(updated.triaged_at)
      : undefined,
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : undefined,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : undefined,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
