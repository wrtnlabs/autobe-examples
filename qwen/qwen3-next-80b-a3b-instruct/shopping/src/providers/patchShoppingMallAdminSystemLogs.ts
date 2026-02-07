import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemLog";
import { IShoppingMallSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemLog";
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

export async function patchShoppingMallAdminSystemLogs(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemLog.IRequest;
}): Promise<IPageIShoppingMallSystemLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build where clause with optional filters
  const whereInput = {} satisfies Prisma.shopping_mall_system_logsWhereInput;
  // Get paginated data
  const data = await MyGlobal.prisma.shopping_mall_system_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      created_at: true,
      event_type: true,
      severity: true,
      metadata: true,
    },
  });
  // Transform data to summary format with metadata length
  const summaryData = data.map((record) => ({
    id: record.id,
    created_at: toISOStringSafe(record.created_at),
    event_type: record.event_type,
    severity: record.severity,
    metadata_length: record.metadata ? record.metadata.length : 0,
  }));
  // Get total count for pagination
  const total = await MyGlobal.prisma.shopping_mall_system_logs.count({
    where: whereInput,
  });
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
