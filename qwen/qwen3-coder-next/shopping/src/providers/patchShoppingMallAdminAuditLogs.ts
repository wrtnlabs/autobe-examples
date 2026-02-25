import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemAuditLog";
import { IShoppingMallSystemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSystemAuditLogAtSummaryTransformer } from "../transformers/ShoppingMallSystemAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemAuditLog.IRequest;
}): Promise<IPageIShoppingMallSystemAuditLog.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering
  const whereInput: Prisma.shopping_mall_system_audit_logsWhereInput = {
    deleted_at: null,
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.operation_type && {
      operation_type: props.body.operation_type,
    }),
    ...(props.body.entity_type && { entity_type: props.body.entity_type }),
    ...(props.body.ip_address && {
      ip_address: { contains: props.body.ip_address },
    }),
    ...(props.body.created_at_gte && {
      created_at: { gte: new Date(props.body.created_at_gte) },
    }),
    ...(props.body.created_at_lte && {
      created_at: { lte: new Date(props.body.created_at_lte) },
    }),
  } satisfies Prisma.shopping_mall_system_audit_logsWhereInput;
  // Query audit logs with selected fields
  const data = await MyGlobal.prisma.shopping_mall_system_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallSystemAuditLogAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.shopping_mall_system_audit_logs.count({
    where: whereInput,
  });
  // Transform database records to API response DTOs
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallSystemAuditLogAtSummaryTransformer.transform,
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination: pagination,
    data: transformedData,
  } satisfies IPageIShoppingMallSystemAuditLog.ISummary;
}
