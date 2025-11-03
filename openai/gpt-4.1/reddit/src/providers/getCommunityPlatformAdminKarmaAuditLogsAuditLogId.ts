import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformKarmaAuditLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaAuditLogs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminKarmaAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformKarmaAuditLogs> {
  const { auditLogId } = props;
  const log =
    await MyGlobal.prisma.community_platform_karma_audit_logs.findUnique({
      where: { id: auditLogId },
    });
  if (!log) {
    throw new HttpException("Karma audit log entry not found", 404);
  }
  return {
    id: log.id,
    community_platform_user_id: log.community_platform_user_id,
    action: log.action,
    reason: log.reason,
    score_delta: log.score_delta,
    prior_karma: log.prior_karma,
    resulting_karma: log.resulting_karma,
    content_reference_id:
      log.content_reference_id !== null ? log.content_reference_id : undefined,
    performed_by_user_id:
      log.performed_by_user_id !== null ? log.performed_by_user_id : undefined,
    created_at: toISOStringSafe(log.created_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  };
}
