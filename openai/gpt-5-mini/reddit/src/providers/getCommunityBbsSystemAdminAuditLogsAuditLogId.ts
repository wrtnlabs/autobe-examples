import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAuditLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function getCommunityBbsSystemAdminAuditLogsAuditLogId(props: {
  systemAdmin: SystemadminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityBbsAuditLog> {
  const { systemAdmin, auditLogId } = props;

  // Authorization: ensure system admin exists and not soft-deleted
  const admin = await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
    where: { id: systemAdmin.id },
    select: { id: true, deleted_at: true },
  });

  if (!admin || admin.deleted_at) {
    throw new HttpException("Unauthorized: admin not found", 403);
  }

  // Retrieve audit log entry
  const record = await MyGlobal.prisma.community_bbs_audit_logs.findUnique({
    where: { id: auditLogId },
  });

  if (!record) {
    throw new HttpException(
      JSON.stringify({
        error: { code: "NOT_FOUND", message: "Audit log not found" },
      }),
      404,
    );
  }

  // Sanitization utility
  const sanitize = (text: string | null | undefined): string | null => {
    if (!text) return null;

    // Mask emails
    let s = text.replace(
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
      "[REDACTED_EMAIL]",
    );

    // Mask IPv4 addresses
    s = s.replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[REDACTED_IP]");

    // Mask token/password patterns
    s = s.replace(
      /(?:access_token|auth_token|token|password)\s*[:=]\s*([^\s,;]+)/gi,
      "[REDACTED_TOKEN]",
    );

    // Mask long hex-like secrets
    s = s.replace(/\b[0-9a-fA-F]{32,}\b/g, "[REDACTED_SECRET]");

    // Normalize whitespace
    s = s.replace(/\s+/g, " ").trim();

    // Truncate to safe summary length
    if (s.length > 512) s = s.slice(0, 512) + "...";

    return s;
  };

  const payloadSummary = sanitize(record.payload ?? null);

  // Record access in append-only audit logs
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: systemAdmin.id,
      entity: "audit_log",
      action: "read",
      payload: JSON.stringify({
        accessed_audit_log_id: record.id,
        note: "accessed for forensic review",
      }),
      ip: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Map polymorphic target
  const target = record.target_post_id
    ? ({
        target_type: "post",
        target_id: record.target_post_id,
      } satisfies ICommunityBbsAuditLog.ITarget)
    : record.target_comment_id
      ? ({
          target_type: "comment",
          target_id: record.target_comment_id,
        } satisfies ICommunityBbsAuditLog.ITarget)
      : record.target_community_id
        ? ({
            target_type: "community",
            target_id: record.target_community_id,
          } satisfies ICommunityBbsAuditLog.ITarget)
        : record.target_user_id
          ? ({
              target_type: "user",
              target_id: record.target_user_id,
            } satisfies ICommunityBbsAuditLog.ITarget)
          : undefined;

  return {
    id: record.id as string & tags.Format<"uuid">,
    target: target,
    actor_type: record.actor_type,
    actor_id:
      record.actor_id === null
        ? null
        : (record.actor_id as string & tags.Format<"uuid">),
    entity: record.entity,
    action: record.action,
    payload_summary: payloadSummary,
    ip: record.ip ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at ? toISOStringSafe(record.updated_at) : null,
  };
}
