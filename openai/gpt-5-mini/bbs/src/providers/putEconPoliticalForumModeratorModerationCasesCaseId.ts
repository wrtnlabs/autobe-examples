import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putEconPoliticalForumModeratorModerationCasesCaseId(props: {
  moderator: ModeratorPayload;
  caseId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumModerationCase.IUpdate;
}): Promise<IEconPoliticalForumModerationCase> {
  const { moderator, caseId, body } = props;

  // Ensure the case exists
  const existing =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findUnique({
      where: { id: caseId },
    });
  if (!existing) throw new HttpException("Not Found", 404);

  // Resolve caller's moderator record
  const callerModerator =
    await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
      where: { registereduser_id: moderator.id, deleted_at: null },
    });
  if (!callerModerator)
    throw new HttpException("Unauthorized: moderator record not found", 403);

  // Uniqueness check for case_number
  if (body.case_number !== undefined && body.case_number !== null) {
    const conflict =
      await MyGlobal.prisma.econ_political_forum_moderation_cases.findFirst({
        where: { case_number: body.case_number, id: { not: caseId } },
      });
    if (conflict)
      throw new HttpException("Conflict: case_number already in use", 409);
  }

  // Validate foreign keys if provided
  if (
    body.assigned_moderator_id !== undefined &&
    body.assigned_moderator_id !== null
  ) {
    const assignedModerator =
      await MyGlobal.prisma.econ_political_forum_moderator.findUnique({
        where: { id: body.assigned_moderator_id },
      });
    if (!assignedModerator)
      throw new HttpException(
        "Bad Request: assigned_moderator_id not found",
        400,
      );
    if (assignedModerator.id !== callerModerator.id)
      throw new HttpException("Forbidden: cannot assign other moderators", 403);
  }

  if (body.owner_admin_id !== undefined && body.owner_admin_id !== null) {
    const ownerAdmin =
      await MyGlobal.prisma.econ_political_forum_administrator.findUnique({
        where: { id: body.owner_admin_id },
      });
    if (!ownerAdmin)
      throw new HttpException("Bad Request: owner_admin_id not found", 400);
  }

  if (body.lead_report_id !== undefined && body.lead_report_id !== null) {
    const report =
      await MyGlobal.prisma.econ_political_forum_reports.findUnique({
        where: { id: body.lead_report_id },
      });
    if (!report)
      throw new HttpException("Bad Request: lead_report_id not found", 400);
  }

  // Prepare timestamp
  const now = toISOStringSafe(new Date());

  // Build plain data object (primitive values only) to avoid typia tags
  const data: Record<string, unknown> = {};

  if (body.assigned_moderator_id !== undefined) {
    data.assigned_moderator_id =
      body.assigned_moderator_id === null
        ? null
        : (body.assigned_moderator_id satisfies
            | string
            | null
            | undefined as string);
  }

  if (body.owner_admin_id !== undefined) {
    data.owner_admin_id =
      body.owner_admin_id === null
        ? null
        : (body.owner_admin_id satisfies string | null | undefined as string);
  }

  if (body.lead_report_id !== undefined) {
    data.lead_report_id =
      body.lead_report_id === null
        ? null
        : (body.lead_report_id satisfies string | null | undefined as string);
  }

  if (body.case_number !== undefined) data.case_number = body.case_number;
  if (body.title !== undefined) data.title = body.title;
  if (body.status !== undefined) data.status = body.status;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.summary !== undefined) data.summary = body.summary;
  if (body.escalation_reason !== undefined)
    data.escalation_reason = body.escalation_reason;
  if (body.legal_hold !== undefined) data.legal_hold = body.legal_hold;

  if (body.closed_at !== undefined) {
    data.closed_at =
      body.closed_at === null ? null : toISOStringSafe(body.closed_at);
  }

  data.updated_at = now;

  // Optimistic concurrency update
  const updateResult =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.updateMany({
      where: { id: caseId, updated_at: existing.updated_at },
      data: data as any,
    });

  if (updateResult.count === 0)
    throw new HttpException("Conflict: concurrent modification", 409);

  // Create moderation log entry
  await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: callerModerator.id,
      moderation_case_id: caseId,
      action_type: "update",
      reason_code: body.escalation_reason ?? "update",
      rationale: body.summary ?? undefined,
      created_at: now,
    },
  });

  // Create audit log entry
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: moderator.id,
      moderator_id: callerModerator.id,
      moderation_case_id: caseId,
      action_type: "update",
      target_type: "moderation_case",
      target_identifier: caseId,
      details: body.summary ?? null,
      created_at: now,
      created_by_system: false,
    },
  });

  // Fetch updated record and convert dates for return
  const updated =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findUniqueOrThrow(
      { where: { id: caseId } },
    );

  return {
    id: updated.id as string & tags.Format<"uuid">,
    assigned_moderator_id: updated.assigned_moderator_id ?? undefined,
    owner_admin_id: updated.owner_admin_id ?? undefined,
    lead_report_id: updated.lead_report_id ?? undefined,
    case_number: updated.case_number,
    title: updated.title ?? null,
    status: updated.status as "open" | "investigating" | "closed" | "on_hold",
    priority: updated.priority as "low" | "normal" | "high" | "urgent",
    summary: updated.summary ?? null,
    escalation_reason: updated.escalation_reason ?? null,
    legal_hold: updated.legal_hold,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    closed_at: updated.closed_at ? toISOStringSafe(updated.closed_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies IEconPoliticalForumModerationCase;
}
