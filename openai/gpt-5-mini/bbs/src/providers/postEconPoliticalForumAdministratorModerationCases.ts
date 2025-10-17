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

export async function postEconPoliticalForumAdministratorModerationCases(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumModerationCase.ICreate;
}): Promise<IEconPoliticalForumModerationCase> {
  const { administrator, body } = props;

  // Authorization: ensure caller is an enrolled administrator
  const enrolledAdmin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });
  if (!enrolledAdmin)
    throw new HttpException("Unauthorized: not an enrolled administrator", 403);

  // Uniqueness check for case_number
  const existing =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findUnique({
      where: { case_number: body.case_number },
    });
  if (existing)
    throw new HttpException("Conflict: case_number already exists", 409);

  // Referential integrity checks for optional foreign keys
  if (
    body.assigned_moderator_id !== undefined &&
    body.assigned_moderator_id !== null
  ) {
    const moderator =
      await MyGlobal.prisma.econ_political_forum_moderator.findUnique({
        where: { id: body.assigned_moderator_id },
      });
    if (!moderator || moderator.deleted_at !== null) {
      throw new HttpException(
        "Bad Request: assigned_moderator_id not found",
        400,
      );
    }
  }

  if (body.owner_admin_id !== undefined && body.owner_admin_id !== null) {
    const ownerAdmin =
      await MyGlobal.prisma.econ_political_forum_administrator.findUnique({
        where: { id: body.owner_admin_id },
      });
    if (!ownerAdmin || ownerAdmin.deleted_at !== null) {
      throw new HttpException("Bad Request: owner_admin_id not found", 400);
    }
  }

  if (body.lead_report_id !== undefined && body.lead_report_id !== null) {
    const report =
      await MyGlobal.prisma.econ_political_forum_reports.findUnique({
        where: { id: body.lead_report_id },
      });
    if (!report || report.deleted_at !== null) {
      throw new HttpException("Bad Request: lead_report_id not found", 400);
    }
  }

  // If legal_hold is requested, application-level preservation should be
  // enforced elsewhere (retention subsystem). We only record the flag here.

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create moderation case
  const created =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.create({
      data: {
        id: v4(),
        assigned_moderator_id: body.assigned_moderator_id ?? null,
        owner_admin_id: body.owner_admin_id ?? null,
        lead_report_id: body.lead_report_id ?? null,
        case_number: body.case_number,
        title: body.title ?? null,
        status: body.status,
        priority: body.priority,
        summary: body.summary ?? null,
        escalation_reason: body.escalation_reason ?? null,
        legal_hold: body.legal_hold,
        created_at: now,
        updated_at: now,
        closed_at: null,
        deleted_at: null,
      },
    });

  // Convert Prisma Date results to ISO strings for API response
  return {
    id: created.id,
    assigned_moderator_id: created.assigned_moderator_id ?? null,
    owner_admin_id: created.owner_admin_id ?? null,
    lead_report_id: created.lead_report_id ?? null,
    case_number: created.case_number,
    title: created.title ?? null,
    status: typia.assert<"open" | "investigating" | "closed" | "on_hold">(
      created.status,
    ),
    priority: typia.assert<"low" | "normal" | "high" | "urgent">(
      created.priority,
    ),
    summary: created.summary ?? null,
    escalation_reason: created.escalation_reason ?? null,
    legal_hold: created.legal_hold,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    closed_at: created.closed_at ? toISOStringSafe(created.closed_at) : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
