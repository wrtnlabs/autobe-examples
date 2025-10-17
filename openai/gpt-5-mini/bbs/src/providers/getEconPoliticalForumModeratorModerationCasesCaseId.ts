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

export async function getEconPoliticalForumModeratorModerationCasesCaseId(props: {
  moderator: ModeratorPayload;
  caseId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumModerationCase> {
  const { moderator, caseId } = props;

  // Load moderation case
  const found =
    await MyGlobal.prisma.econ_political_forum_moderation_cases.findUnique({
      where: { id: caseId },
    });

  if (!found) throw new HttpException("Not Found", 404);
  if (found.deleted_at) throw new HttpException("Not Found", 404);

  // Record access in audit logs
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: moderator.id,
      moderator_id: null,
      post_id: null,
      thread_id: null,
      report_id: null,
      moderation_case_id: found.id,
      action_type: "read",
      target_type: "moderation_case",
      target_identifier: found.id,
      details: `Moderator ${moderator.id} retrieved moderation case ${found.id}`,
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  return {
    id: found.id as string & tags.Format<"uuid">,
    assigned_moderator_id: found.assigned_moderator_id ?? null,
    owner_admin_id: found.owner_admin_id ?? null,
    lead_report_id: found.lead_report_id ?? null,
    case_number: found.case_number,
    title: found.title ?? null,
    status: found.status as "open" | "investigating" | "closed" | "on_hold",
    priority: found.priority as "low" | "normal" | "high" | "urgent",
    summary: found.summary ?? null,
    escalation_reason: found.escalation_reason ?? null,
    legal_hold: found.legal_hold,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    closed_at: found.closed_at ? toISOStringSafe(found.closed_at) : null,
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
