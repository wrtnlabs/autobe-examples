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

export async function getEconPoliticalForumAdministratorModerationCasesCaseId(props: {
  administrator: AdministratorPayload;
  caseId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumModerationCase> {
  const { administrator, caseId } = props;

  // Ensure administrator enrollment exists
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id },
    });
  if (!adminRecord)
    throw new HttpException("Unauthorized: administrator not enrolled", 403);

  // Retrieve the moderation case (allow archived records to be visible to admins)
  const record =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findUnique({
      where: { id: caseId },
    });
  if (!record) throw new HttpException("Not Found", 404);

  // Audit the access for compliance
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "read",
      target_type: "moderation_case",
      target_identifier: caseId,
      details: `Administrator ${administrator.id} viewed moderation case ${caseId}`,
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  return {
    id: record.id as string & tags.Format<"uuid">,
    assigned_moderator_id: record.assigned_moderator_id ?? null,
    owner_admin_id: record.owner_admin_id ?? null,
    lead_report_id: record.lead_report_id ?? null,
    case_number: record.case_number,
    title: record.title ?? null,
    status: record.status as "open" | "investigating" | "closed" | "on_hold",
    priority: record.priority as "low" | "normal" | "high" | "urgent",
    summary: record.summary ?? null,
    escalation_reason: record.escalation_reason ?? null,
    legal_hold: record.legal_hold,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    closed_at: record.closed_at ? toISOStringSafe(record.closed_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
