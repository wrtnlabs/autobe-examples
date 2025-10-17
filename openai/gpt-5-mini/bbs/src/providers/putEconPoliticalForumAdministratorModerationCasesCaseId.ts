import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationCase";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putEconPoliticalForumAdministratorModerationCasesCaseId(props: {
  administrator: AdministratorPayload;
  caseId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumModerationCase.IUpdate;
}): Promise<IEconPoliticalForumModerationCase> {
  const { administrator, caseId, body } = props;

  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });
  if (!adminRecord)
    throw new HttpException(
      "Unauthorized: administrator enrollment required",
      403,
    );

  const original =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findUnique({
      where: { id: caseId },
    });
  if (!original) throw new HttpException("Not Found", 404);

  if (body.case_number !== undefined && body.case_number !== null) {
    const conflict =
      await MyGlobal.prisma.econ_political_forum_moderation_cases.findFirst({
        where: {
          case_number: body.case_number,
          NOT: { id: caseId },
          deleted_at: null,
        },
      });
    if (conflict)
      throw new HttpException("Conflict: case_number already in use", 409);
  }

  if (
    body.assigned_moderator_id !== undefined &&
    body.assigned_moderator_id !== null
  ) {
    const moderator =
      await MyGlobal.prisma.econ_political_forum_moderator.findFirst({
        where: { id: body.assigned_moderator_id, deleted_at: null },
      });
    if (!moderator)
      throw new HttpException(
        "Bad Request: assigned_moderator_id not found",
        400,
      );
  }

  if (body.owner_admin_id !== undefined && body.owner_admin_id !== null) {
    const owner =
      await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
        where: { id: body.owner_admin_id, deleted_at: null },
      });
    if (!owner)
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

  const changedFields: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(body) as Array<keyof typeof body>) {
    const newValue = body[key];
    if (newValue === undefined) continue;
    const oldValue = (original as any)[key];
    if (newValue !== oldValue)
      changedFields[String(key)] = { from: oldValue, to: newValue };
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.update({
      where: { id: caseId },
      data: {
        ...(body.assigned_moderator_id !== undefined && {
          assigned_moderator_id: body.assigned_moderator_id,
        }),
        ...(body.owner_admin_id !== undefined && {
          owner_admin_id: body.owner_admin_id,
        }),
        ...(body.lead_report_id !== undefined && {
          lead_report_id: body.lead_report_id,
        }),
        ...(body.case_number !== undefined && {
          case_number: body.case_number === null ? undefined : body.case_number,
        }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.status !== undefined && {
          status: body.status === null ? undefined : body.status,
        }),
        ...(body.priority !== undefined && {
          priority: body.priority === null ? undefined : body.priority,
        }),
        ...(body.summary !== undefined && { summary: body.summary }),
        ...(body.escalation_reason !== undefined && {
          escalation_reason: body.escalation_reason,
        }),
        ...(body.legal_hold !== undefined && {
          legal_hold: body.legal_hold === null ? undefined : body.legal_hold,
        }),
        ...(body.closed_at !== undefined && {
          closed_at:
            body.closed_at === null ? null : toISOStringSafe(body.closed_at),
        }),
        updated_at: now,
      },
    });

  const reasonCode = (body.escalation_reason ??
    body.status ??
    "update") as string;

  await MyGlobal.prisma.econ_political_forum_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      acted_admin_id: adminRecord.id,
      moderation_case_id: caseId,
      action_type: "update",
      reason_code: reasonCode,
      rationale: body.summary ?? null,
      created_at: now,
    },
  });

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      moderation_case_id: caseId,
      action_type: "update",
      target_type: "moderation_case",
      target_identifier: updated.case_number,
      details: JSON.stringify(changedFields),
      created_at: now,
      created_by_system: false,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    assigned_moderator_id: updated.assigned_moderator_id ?? null,
    owner_admin_id: updated.owner_admin_id ?? null,
    lead_report_id: updated.lead_report_id ?? null,
    case_number: updated.case_number,
    title: updated.title ?? null,
    status: typia.assert<"open" | "investigating" | "closed" | "on_hold">(
      updated.status,
    ),
    priority: typia.assert<"low" | "normal" | "high" | "urgent">(
      updated.priority,
    ),
    summary: updated.summary ?? null,
    escalation_reason: updated.escalation_reason ?? null,
    legal_hold: updated.legal_hold,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    closed_at: updated.closed_at ? toISOStringSafe(updated.closed_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } as IEconPoliticalForumModerationCase;
}
