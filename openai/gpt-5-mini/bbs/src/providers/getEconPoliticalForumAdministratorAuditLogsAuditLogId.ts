import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAuditLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getEconPoliticalForumAdministratorAuditLogsAuditLogId(props: {
  administrator: AdministratorPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IEconPoliticalForumAuditLog> {
  const { administrator, auditLogId } = props;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(String(auditLogId)))
    throw new HttpException("Bad Request: Invalid auditLogId", 400);

  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: { registereduser_id: administrator.id, deleted_at: null },
    });
  if (!adminRecord)
    throw new HttpException("Forbidden: Unauthorized administrator", 403);

  const audit =
    await MyGlobal.prisma.econ_political_forum_audit_logs.findUnique({
      where: { id: auditLogId },
    });
  if (!audit) throw new HttpException("Not Found", 404);

  if (
    audit.moderation_case_id !== null &&
    audit.moderation_case_id !== undefined
  ) {
    const mcase =
      await MyGlobal.prisma.econ_political_forum_moderation_cases.findUnique({
        where: { id: audit.moderation_case_id },
      });
    if (mcase && mcase.legal_hold === true && !adminRecord.is_super)
      throw new HttpException(
        "Forbidden: Access to audit log restricted due to active legal hold",
        403,
      );
  }

  const canViewDetails = Boolean(adminRecord.is_super);

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "accessed_audit_log",
      target_type: "audit_log",
      target_identifier: audit.id,
      details:
        (audit.moderation_case_id
          ? `Accessed audit ${audit.id} (moderation_case=${audit.moderation_case_id})`
          : `Accessed audit ${audit.id}`) +
        (canViewDetails ? " [full_details_granted]" : " [details_redacted]"),
      created_at: toISOStringSafe(new Date()),
      created_by_system: false,
    },
  });

  return {
    id: audit.id as string & tags.Format<"uuid">,
    registereduser_id:
      audit.registereduser_id === null
        ? null
        : (audit.registereduser_id as string & tags.Format<"uuid">),
    moderator_id:
      audit.moderator_id === null
        ? null
        : (audit.moderator_id as string & tags.Format<"uuid">),
    post_id:
      audit.post_id === null
        ? null
        : (audit.post_id as string & tags.Format<"uuid">),
    thread_id:
      audit.thread_id === null
        ? null
        : (audit.thread_id as string & tags.Format<"uuid">),
    report_id:
      audit.report_id === null
        ? null
        : (audit.report_id as string & tags.Format<"uuid">),
    moderation_case_id:
      audit.moderation_case_id === null
        ? null
        : (audit.moderation_case_id as string & tags.Format<"uuid">),
    action_type: audit.action_type,
    target_type: audit.target_type,
    target_identifier: audit.target_identifier ?? null,
    details: audit.details
      ? canViewDetails
        ? audit.details
        : "[REDACTED]"
      : null,
    created_at: toISOStringSafe(audit.created_at),
    created_by_system: audit.created_by_system,
  };
}
