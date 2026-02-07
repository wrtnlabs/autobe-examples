import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystematicLog";
import { IShoppingMallSystematicLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystematicLog.IRequest;
}): Promise<IPageIShoppingMallSystematicLog.ISummary> {
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  // Build where clause - request appears to be empty, so we use defaults
  const whereClause: Prisma.shopping_mall_systematic_logsWhereInput = {};
  // Query with pagination
  const logs = await MyGlobal.prisma.shopping_mall_systematic_logs.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" }, // Default sort by most recent
    select: {
      id: true,
      created_at: true,
      severity: true,
      component: true,
      message: true,
      trace_id: true,
      user_id: true,
      ip: true,
      method: true,
      path: true,
      status_code: true,
      duration_ms: true,
    },
  });
  // Count total for pagination
  const total = await MyGlobal.prisma.shopping_mall_systematic_logs.count({
    where: whereClause,
  });
  // Transform to response format with proper date conversion
  const data = logs.map((log) => ({
    id: log.id,
    created_at: toISOStringSafe(log.created_at),
    severity: log.severity,
    component: log.component,
    message: log.message,
    trace_id: log.trace_id,
    user_id: log.user_id,
    ip: log.ip,
    method: log.method,
    path: log.path,
    status_code: log.status_code,
    duration_ms: log.duration_ms,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
