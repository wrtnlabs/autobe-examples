import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorAuditLogsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const auditLog = await MyGlobal.prisma.discussion_board_audit_logs.findUnique(
    {
      where: { id: props.id },
      include: {
        actor: true,
      },
    },
  );
  if (auditLog === null) throw new HttpException("Audit log not found", 404);
  return {
    id: auditLog.id,
    actor_id: auditLog.actor_id ?? null,
    event_type: auditLog.event_type,
    event_description: auditLog.event_description,
    created_at:
      typeof auditLog.created_at === "string"
        ? auditLog.created_at
        : toISOStringSafe(auditLog.created_at),
    updated_at:
      typeof auditLog.updated_at === "string"
        ? auditLog.updated_at
        : toISOStringSafe(auditLog.updated_at),
    deleted_at:
      auditLog.deleted_at === null
        ? null
        : typeof auditLog.deleted_at === "string"
          ? auditLog.deleted_at
          : toISOStringSafe(auditLog.deleted_at),
    actor: auditLog.actor ?? null,
  };
}
