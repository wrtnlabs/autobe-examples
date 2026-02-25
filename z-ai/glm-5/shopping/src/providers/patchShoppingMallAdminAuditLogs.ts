import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
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
import { ShoppingMallAdminAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallAdminAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAdminAuditLog.IRequest;
}): Promise<IPageIShoppingMallAdminAuditLog.ISummary> {
  // Get admin grade to determine access level
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { grade: true },
    });
  const isSuperAdmin = adminRecord.grade === "super";
  // Build where clause
  const whereInput = {
    // Regular admins can only see their own actions
    ...(isSuperAdmin === false
      ? { shopping_mall_admin_id: props.admin.id }
      : {}),
    // Super admin filter (only applicable for super admins)
    ...(isSuperAdmin && props.body.shopping_mall_admin_id
      ? { shopping_mall_admin_id: props.body.shopping_mall_admin_id }
      : {}),
    // Other filters
    ...(props.body.action ? { action: props.body.action } : {}),
    ...(props.body.target_type ? { target_type: props.body.target_type } : {}),
    ...(props.body.target_id ? { target_id: props.body.target_id } : {}),
    ...(props.body.ip ? { ip: { contains: props.body.ip } } : {}),
    ...(props.body.created_from
      ? { created_at: { gte: new Date(props.body.created_from) } }
      : {}),
    ...(props.body.created_to
      ? { created_at: { lte: new Date(props.body.created_to) } }
      : {}),
  } satisfies Prisma.shopping_mall_admin_audit_logsWhereInput;
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Execute count
  const total = await MyGlobal.prisma.shopping_mall_admin_audit_logs.count({
    where: whereInput,
  });
  // Execute findMany
  const data = await MyGlobal.prisma.shopping_mall_admin_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdminAuditLogAtSummaryTransformer.select(),
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
