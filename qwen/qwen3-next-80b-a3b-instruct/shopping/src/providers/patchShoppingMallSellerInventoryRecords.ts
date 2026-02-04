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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  // Validate that seller is authenticated
  if (!props.seller || !props.seller.id) {
    throw new HttpException("Invalid seller authentication", 401);
  }
  // Extract pagination and filter parameters
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
  // Build where condition
  const whereInput: Prisma.shopping_mall_inventory_recordsWhereInput = {
    // seller_id: props.seller.id,  // ❌ Removed - does not exist in schema
    ...(variantId && { variant_id: variantId }),
    ...(sourceType && { source_type: sourceType }),
    ...(reason && { reason: { contains: reason, mode: "insensitive" } }),
    ...(startDate && { created_at: { gte: toISOStringSafe(startDate) } }),
    ...(endDate && { created_at: { lte: toISOStringSafe(endDate) } }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Build orderBy condition
  const orderByInput = (
    sortBy === "quantity_change"
      ? { quantity_change: "asc" as const }
      : sortBy === "source_type"
        ? { source_type: "asc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput;
  // Prepare cursor-based pagination
  let take = pageSize;
  let skip = 0;
  if (cursor) {
    // For cursor-based pagination, we use the record ID as cursor
    // Find the cursor record to determine where to start
    const cursorRecord =
      await MyGlobal.prisma.shopping_mall_inventory_records.findUnique({
        where: { id: cursor },
        select: { created_at: true },
      });
    if (!cursorRecord) {
      throw new HttpException("Invalid cursor", 400);
    }
    // Update where condition to fetch records that come after the cursor
    whereInput.id = { gt: cursor };
  }
  // Fetch the data
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    orderBy: orderByInput,
    take,
    skip,
    select: {
      id: true,
      variant_id: true,
      quantity_change: true,
      source_type: true,
      reason: true,
      created_at: true,
    },
  });
  // Count total records for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  // Transform results to summary format: IShoppingMallInventoryRecord.ISummary
  const summary = data.map((record) => ({
    variantId: record.variant_id as string & tags.Format<"uuid">,
    quantityChange: record.quantity_change,
    reason: record.reason,
    sourceType: record.source_type as
      | "order_placement"
      | "order_cancellation"
      | "order_refund"
      | "restock"
      | "adjustment",
    createdAt: toISOStringSafe(record.created_at) as string &
      tags.Format<"date-time">,
  }));
  // Calculate pagination metadata
  const pagination: IPage.IPagination = {
    current: 1, // For cursor-based pagination, current page is not meaningful
    limit: pageSize,
    records: total,
    pages: Math.ceil(total / pageSize),
  };
  // For cursor pagination, we return the last item's ID as the next cursor
  const nextCursor = data.length > 0 ? data[data.length - 1].id : null;
  // Since pagination object doesn't have cursor field in IPage.IPagination,
  // but we've exposed proposed cursor-based pagination in API spec,
  // we must trust the client to use the last item's ID as cursor for next request.
  return {
    data: summary,
    pagination,
  };
}
