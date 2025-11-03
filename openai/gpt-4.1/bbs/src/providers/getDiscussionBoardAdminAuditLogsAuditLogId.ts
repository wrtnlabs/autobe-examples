import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const { auditLogId } = props;
  const auditLog = await MyGlobal.prisma.discussion_board_audit_logs.findUnique(
    {
      where: { id: auditLogId },
      include: {
        actorAdmin: true,
      },
    },
  );
  if (!auditLog) throw new HttpException("Audit log entry not found", 404);
  const actor = auditLog.actorAdmin;
  return {
    id: auditLog.id,
    actor_admin: {
      id: actor.id,
      email: actor.email,
      display_name: actor.display_name,
      avatar_url:
        typeof actor.avatar_url === "string" ? actor.avatar_url : undefined,
      is_locked: actor.is_locked,
      deleted_at: actor.deleted_at
        ? toISOStringSafe(actor.deleted_at)
        : undefined,
      created_at: toISOStringSafe(actor.created_at),
      updated_at: toISOStringSafe(actor.updated_at),
    },
    target_article_id: auditLog.target_article_id ?? undefined,
    target_comment_id: auditLog.target_comment_id ?? undefined,
    moderation_action_id: auditLog.moderation_action_id,
    event_type: auditLog.audit_event_type,
    audit_details: auditLog.audit_details,
    created_at: toISOStringSafe(auditLog.created_at),
  };
}
