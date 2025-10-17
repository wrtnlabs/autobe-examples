import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";
import { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAuditLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallAuditLog.IRequest;
}): Promise<IPageIShoppingMallAuditLog> {
  const {
    page: inputPage,
    limit: inputLimit,
    search,
    admin_id: adminId,
    entity_id: entityId,
    action,
    timestamp_before: timestampBefore,
    timestamp_after: timestampAfter,
  } = props.body;

  const page = inputPage ?? 1;
  const limit = inputLimit ?? 100;
  const skip = (page - 1) * limit;

  // Build where clause with explicit undefined checks
  const where = {
    ...(adminId !== undefined && { admin_id: adminId }),
    ...(entityId !== undefined && { entity_id: entityId }),
    ...(action !== undefined && { action: { contains: action } }),
    ...((timestampAfter !== undefined || timestampBefore !== undefined) && {
      timestamp: {
        ...(timestampAfter !== undefined && { gte: timestampAfter }),
        ...(timestampBefore !== undefined && { lte: timestampBefore }),
      },
    }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_audit_logs.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_audit_logs.count({ where }),
  ]);

  const data = results.map((record) => ({
    id: record.id,
    admin_id: record.admin_id === null ? null : record.admin_id,
    entity_id: record.entity_id === null ? null : record.entity_id,
    action: record.action,
    timestamp: toISOStringSafe(record.timestamp),
    details: record.details === undefined ? null : record.details,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
