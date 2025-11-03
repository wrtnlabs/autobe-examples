import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorAuditLogsAuditLogId(props: {
  moderator: ModeratorPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const { moderator, auditLogId } = props;

  const audit = await MyGlobal.prisma.discussion_board_audit_logs.findUnique({
    where: { id: auditLogId },
  });

  if (!audit) throw new HttpException("Not Found", 404);

  const moderatorRecord =
    await MyGlobal.prisma.discussion_board_moderator.findUnique({
      where: { id: moderator.id },
      select: { id: true, deleted_at: true },
    });

  if (!moderatorRecord || moderatorRecord.deleted_at !== null) {
    throw new HttpException("Unauthorized", 403);
  }

  const canViewUnredacted =
    audit.actor_type === "moderator" &&
    audit.actor_id !== null &&
    audit.actor_id === moderator.id;

  const accessedAt = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.discussion_board_audit_log_accesses.create({
      data: {
        id: v4(),
        discussion_board_audit_log_id: audit.id,
        accessed_at: accessedAt,
        accessor_type: "moderator",
        accessor_id: moderator.id,
        accessor_role: null,
        access_purpose: null,
        ip: null,
        user_agent: null,
        metadata: null,
        created_at: accessedAt,
      },
    });
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }

  const actorType =
    audit.actor_type === "member" ||
    audit.actor_type === "moderator" ||
    audit.actor_type === "system" ||
    audit.actor_type === "guest"
      ? (audit.actor_type as "member" | "moderator" | "system" | "guest")
      : "system";

  return {
    id: audit.id,
    event_type: audit.event_type,
    event_timestamp: toISOStringSafe(audit.event_timestamp),
    resource_type: audit.resource_type ?? null,
    resource_id: audit.resource_id ?? null,
    actor_type: actorType,
    actor_id: audit.actor_id ?? null,
    ip: audit.ip ?? null,
    user_agent: audit.user_agent ?? null,
    metadata: canViewUnredacted ? (audit.metadata ?? null) : null,
    created_at: toISOStringSafe(audit.created_at),
    updated_at: toISOStringSafe(audit.updated_at),
    deleted_at: audit.deleted_at ? toISOStringSafe(audit.deleted_at) : null,
  };
}
