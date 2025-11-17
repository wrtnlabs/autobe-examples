import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallAdminAuditLogsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminAuditLog> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_audit_logs.findUnique({
      where: { id: props.id },
    });

  if (!record) {
    throw new HttpException("Admin audit log entry not found", 404);
  }

  return {
    id: record.id,
    shopping_mall_admin_id: record.shopping_mall_admin_id,
    action_type: record.action_type,
    resource_type: record.resource_type,
    resource_id: record.resource_id ?? null,
    success: record.success,
    details: record.details ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
