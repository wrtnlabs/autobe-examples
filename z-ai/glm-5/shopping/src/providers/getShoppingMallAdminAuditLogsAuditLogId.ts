import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAuditLogTransformer } from "../transformers/ShoppingMallAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string;
}): Promise<IShoppingMallAdminAuditLog> {
  // Get current admin's grade for authorization
  const currentAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true },
    });
  // Fetch the audit log with admin relation
  const auditLog =
    await MyGlobal.prisma.shopping_mall_admin_audit_logs.findUniqueOrThrow({
      where: { id: props.auditLogId },
      ...ShoppingMallAdminAuditLogTransformer.select(),
    });
  // Authorization: super admin can view any, regular admin only own
  if (currentAdmin.grade !== "super" && auditLog.admin.id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallAdminAuditLogTransformer.transform(auditLog);
}
