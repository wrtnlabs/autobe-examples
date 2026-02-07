import { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAuditLogsLogId(props: {
  superAdmin: SuperadminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAuditLog> {
  const log = await MyGlobal.prisma.discussion_board_audit_logs.findUnique({
    where: { id: props.logId },
  });
  if (!log) {
    throw new HttpException("Audit log not found", 404);
  }
  return {
    id: log.id,
    actor_id: log.actor_id ?? undefined,
    target_user_id: log.target_user_id ?? undefined,
    target_admin_id: log.target_admin_id ?? undefined,
    target_super_admin_id: log.target_super_admin_id ?? undefined,
    target_article_id: log.target_article_id ?? undefined,
    target_comment_id: log.target_comment_id ?? undefined,
    target_section_id: log.target_section_id ?? undefined,
    actor_type: log.actor_type,
    action_type: log.action_type,
    action_subtype: log.action_subtype ?? undefined,
    description: log.description,
    ip_address: log.ip_address ?? undefined,
    user_agent: log.user_agent ?? undefined,
    metadata: log.metadata ?? undefined,
    success: log.success,
    error_message: log.error_message ?? undefined,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
  };
}
