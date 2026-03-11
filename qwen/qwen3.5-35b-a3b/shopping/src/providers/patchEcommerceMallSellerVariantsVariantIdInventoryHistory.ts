import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerVariantsVariantIdInventoryHistory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.IHistoryList> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "newest";
  // Verify variant ownership
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, product_id: true },
    });
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: {
      id: variant.product_id,
      seller_id: props.seller.id,
    },
  });
  // Build WHERE clause with string timestamps (no Date type)
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    variant_id: props.variantId,
    ...(props.body.dateRange && {
      timestamp: {
        ...(props.body.dateRange.start && {
          gte: props.body.dateRange.start as string,
        }),
        ...(props.body.dateRange.end && {
          lte: props.body.dateRange.end as string,
        }),
      },
    }),
    ...(props.body.reason && { reason: props.body.reason }),
  };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  // Get ALL records for running total calculation (fetch without pagination)
  const allRecords =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: [{ timestamp: "asc" as const }], // chronological for running total calculation
      select: {
        id: true,
        variant_id: true,
        quantity_change: true,
        reason: true,
        timestamp: true,
      },
    });
  // Calculate running totals in memory
  let cumulativeSum = 0;
  const recordsWithRunningTotal = allRecords.map((record) => {
    cumulativeSum += record.quantity_change;
    return {
      id: record.id,
      variant_id: record.variant_id,
      quantity_change: record.quantity_change,
      reason: record.reason as
        | "restock"
        | "order"
        | "cancellation"
        | "refund"
        | "adjustment"
        | "loss",
      timestamp: toISOStringSafe(record.timestamp),
      running_total: cumulativeSum,
    } satisfies IEcommerceMallInventoryRecord.IHistoryItem;
  });
  // Apply pagination and sorting to final result
  const sortedRecords =
    sortBy === "newest"
      ? recordsWithRunningTotal.reverse()
      : recordsWithRunningTotal;
  const paginatedRecords = sortedRecords.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: [
      {
        records: paginatedRecords,
      },
    ],
  } satisfies IPageIEcommerceMallInventoryRecord.IHistoryList;
}
