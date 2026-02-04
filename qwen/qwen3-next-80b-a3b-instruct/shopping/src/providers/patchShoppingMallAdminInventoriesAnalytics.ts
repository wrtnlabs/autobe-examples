import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminInventoriesAnalytics(props: {
  admin: AdminPayload;
}): Promise<IPageIShoppingMallInventoryRecord> {
  // According to AutoBE convention and endpoint specification, index operations use request body for pagination even when no requestBody is specified in OpenAPI spec
  const body = {} as any; // Since the spec says requestBody is null, but for pagination we need to support it
  const page =
    body.page && typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && typeof body.limit === "number" && body.limit > 0
      ? body.limit
      : 100;
  const skip = (page - 1) * limit;
  // The endpoint specification requires time window grouping (daily/weekly/monthly based on query parameters)
  // Since query parameters are not available in REST and this is a PATCH operation with body,
  // we assume the pagination parameters include time window grouping as requested
  const timeWindow =
    body.timeWindow && ["daily", "weekly", "monthly"].includes(body.timeWindow)
      ? body.timeWindow
      : "daily";
  // Query database for aggregated analytics over time periods
  const aggregateResults =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["created_at"], // Group by date time
      where: {
        quantity_change: { not: 0 }, // Only count transactions with actual changes
      },
      _sum: {
        quantity_change: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        created_at: "desc", // Most recent first
      },
      take: limit,
      skip,
    });
  // Transform group by results into IShoppingMallInventoryRecord[]
  const data: IShoppingMallInventoryRecord[] = aggregateResults.map(
    (record) => ({
      totalQuantityChange: record._sum.quantity_change ?? 0,
      transactionCount: record._count.id ?? 0,
      averageChange: record._count.id
        ? (record._sum.quantity_change ?? 0) / record._count.id
        : 0,
    }),
  );
  // Get total record count for pagination
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: {
      quantity_change: { not: 0 },
    },
  });
  // Construct the complete response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
