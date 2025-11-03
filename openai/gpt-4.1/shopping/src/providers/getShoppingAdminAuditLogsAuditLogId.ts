import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IShoppingAuditLog> {
  const found = await MyGlobal.prisma.shopping_audit_logs.findFirst({
    where: {
      id: props.auditLogId,
      deleted_at: null,
    },
  });
  if (!found) {
    throw new HttpException("Audit log not found", 404);
  }
  return {
    id: found.id,
    admin_id: found.admin_id ?? undefined,
    seller_id: found.seller_id ?? undefined,
    customer_id: found.customer_id ?? undefined,
    category: found.category,
    event_type: found.event_type,
    ip: found.ip ?? undefined,
    description: found.description ?? undefined,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at
      ? toISOStringSafe(found.deleted_at)
      : undefined,
  };
}
