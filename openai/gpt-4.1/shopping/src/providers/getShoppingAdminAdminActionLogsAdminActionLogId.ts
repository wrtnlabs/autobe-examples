import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminActionLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminAdminActionLogsAdminActionLogId(props: {
  admin: AdminPayload;
  adminActionLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingAdminActionLog> {
  const entry = await MyGlobal.prisma.shopping_admin_action_logs.findUnique({
    where: { id: props.adminActionLogId },
  });
  if (!entry || entry.deleted_at !== null) {
    throw new HttpException("Admin action log not found", 404);
  }
  return {
    id: entry.id,
    admin_id: entry.admin_id === null ? null : entry.admin_id,
    affected_admin_id:
      entry.affected_admin_id === null ? null : entry.affected_admin_id,
    affected_seller_id:
      entry.affected_seller_id === null ? null : entry.affected_seller_id,
    affected_customer_id:
      entry.affected_customer_id === null ? null : entry.affected_customer_id,
    action_type: entry.action_type,
    entity_type: entry.entity_type === null ? null : entry.entity_type,
    entity_id: entry.entity_id === null ? null : entry.entity_id,
    reason: entry.reason === null ? null : entry.reason,
    created_at: toISOStringSafe(entry.created_at),
    deleted_at:
      entry.deleted_at === null ? undefined : toISOStringSafe(entry.deleted_at),
  };
}
