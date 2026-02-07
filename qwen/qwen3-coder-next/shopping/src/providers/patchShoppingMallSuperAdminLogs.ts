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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminLogs(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSystematicLog.IRequest;
}): Promise<IPageIShoppingMallSystematicLog> {
  // Use default values for pagination as the IRequest interface doesn't include these properties
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause for filtering - only use properties that exist in IRequest
  const whereClause: Prisma.shopping_mall_systematic_logsWhereInput = {};
  // Retrieve logs with pagination
  const logs = await MyGlobal.prisma.shopping_mall_systematic_logs.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
  });
  // Count total logs for pagination
  const total = await MyGlobal.prisma.shopping_mall_systematic_logs.count({
    where: whereClause,
  });
  // Transform logs to response format with proper date handling
  const data: IShoppingMallSystematicLog[] = logs.map((log) => ({
    id: log.id,
    created_at: toISOStringSafe(log.created_at),
    severity: log.severity,
    component: log.component,
    message: log.message,
    context: log.context,
    trace_id: log.trace_id,
    user_id: log.user_id,
    ip: log.ip,
    method: log.method,
    path: log.path,
    status_code: log.status_code,
    duration_ms: log.duration_ms,
    stack_trace: log.stack_trace,
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
