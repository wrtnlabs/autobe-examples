import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

export async function getShoppingMallAuditLogsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAuditLog> {
  const { id } = props;

  const auditLog =
    await MyGlobal.prisma.shopping_mall_audit_logs.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: auditLog.id,
    admin_id: auditLog.admin_id ?? null,
    entity_id: auditLog.entity_id ?? null,
    action: auditLog.action,
    timestamp: toISOStringSafe(auditLog.timestamp),
    details: auditLog.details ?? null,
  };
}
