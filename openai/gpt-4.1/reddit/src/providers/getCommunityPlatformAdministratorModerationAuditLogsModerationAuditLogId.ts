import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorModerationAuditLogsModerationAuditLogId(props: {
  administrator: AdministratorPayload;
  moderationAuditLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationAuditLog> {
  const auditLog =
    await MyGlobal.prisma.community_platform_moderation_audit_logs.findUnique({
      where: { id: props.moderationAuditLogId },
    });

  if (!auditLog) {
    throw new HttpException("Moderation audit log not found", 404);
  }

  return {
    id: auditLog.id,
    moderation_action: { id: auditLog.moderation_action_id },
    report:
      auditLog.report_id !== null && auditLog.report_id !== undefined
        ? { id: auditLog.report_id }
        : undefined,
    actor_moderator:
      auditLog.actor_moderator_id !== null &&
      auditLog.actor_moderator_id !== undefined
        ? { id: auditLog.actor_moderator_id }
        : undefined,
    actor_administrator:
      auditLog.actor_administrator_id !== null &&
      auditLog.actor_administrator_id !== undefined
        ? { id: auditLog.actor_administrator_id }
        : undefined,
    event_type: auditLog.event_type,
    event_reason: auditLog.event_reason ?? undefined,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
