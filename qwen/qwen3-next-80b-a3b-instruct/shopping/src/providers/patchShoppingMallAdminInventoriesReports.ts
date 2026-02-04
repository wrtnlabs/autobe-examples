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
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminInventoriesReports(props: {
  admin: AdminPayload;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord> {
  const {
    variantId,
    sourceType,
    reason,
    startDate,
    endDate,
    sortBy = "created_at",
    pageSize = 10,
    cursor,
  } = props.body;
  // Build WHERE clause with proper type safety
  const whereInput = {
    ...(variantId && { variant_id: variantId }),
    ...(sourceType && { source_type: sourceType }),
    ...(reason && { reason: { contains: reason } }),
    ...(startDate && { created_at: { gte: startDate } }),
    ...(endDate && { created_at: { lte: endDate } }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Build ORDER BY clause with const and type safety
  const orderByInput = (
    sortBy === "created_at"
      ? { created_at: "desc" as const }
      : sortBy === "quantity_change"
        ? { quantity_change: "desc" as const }
        : sortBy === "source_type"
          ? { source_type: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput;
  // Query for data with cursor-based pagination
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    orderBy: orderByInput,
    take: pageSize + 1, // Fetch one extra to check for hasMore
    skip: cursor ? 1 : 0, // Skip first record if cursor is provided
    cursor: cursor ? { id: cursor } : undefined,
  });
  // Determine pagination state
  const hasMore = data.length > pageSize;
  const lastItem = hasMore ? data.pop() : null;
  const nextCursor = lastItem ? lastItem.id : null;
  // Perform aggregation via database for better performance and accuracy
  const aggregation =
    await MyGlobal.prisma.shopping_mall_inventory_records.aggregate({
      where: whereInput,
      _sum: { quantity_change: true },
      _count: { id: true },
    });
  // Calculate aggregation values with type safety
  const totalQuantityChange = aggregation._sum.quantity_change || 0;
  const transactionCount = aggregation._count.id || 0;
  const averageChange =
    transactionCount > 0 ? totalQuantityChange / transactionCount : 0;
  // Map data to response format with proper type safety
  const mappedData: IShoppingMallInventoryRecord[] = [
    {
      totalQuantityChange,
      transactionCount,
      averageChange,
    },
  ];
  // Build pagination object with proper type safety
  const pagination: IPage.IPagination = {
    current: 1,
    limit: pageSize,
    records: transactionCount,
    pages: Math.ceil(transactionCount / pageSize),
  };
  return {
    data: mappedData,
    pagination,
  };
}
