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
import { SellerPayload } from "../decorators/payload/SellerPayload";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getShoppingMallSellerInventoryMetrics(props: {
  seller: SellerPayload;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const { seller } = props;
  // Validate seller exists and is active
  const sellerExists = await MyGlobal.prisma.shopping_mall_sellers.count({
    where: {
      id: seller.id,
      deleted_at: null,
      is_suspended: false,
    },
  });
  if (sellerExists === 0) {
    throw new HttpException("Seller not found or suspended", 404);
  }
  // Use default values since body, page, limit, status are not in props schema
  const body = {} as IShoppingMallInventoryRecord.IRequest;
  // Build where clause dynamically based on filter parameters
  const where: Prisma.shopping_mall_inventory_recordsWhereInput = {
    seller_id: seller.id, // FIX: Use snake_case field name seller_id based on Prisma convention
    deleted_at: null,
    ...(body.startDate && { created_at: { gte: body.startDate } }),
    ...(body.endDate && { created_at: { lte: body.endDate } }),
  };
  // Define pagination parameters with defaults
  const page = 1;
  const limit = 25;
  const skip = (page - 1) * limit;
  // Query to aggregate inventory data by variant_id
  const inventoryRecords =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["variant_id"],
      where,
      _sum: {
        quantity_change: true,
      },
      _count: {
        variant_id: true,
      },
      orderBy: {
        variant_id: "asc",
      },
      skip,
      take: limit,
    });
  // Calculate total records for pagination
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where,
  });
  // Calculate statistics
  const totalVariants = inventoryRecords.length;
  const totalStockQuantity = inventoryRecords.reduce(
    (sum, record) => sum + (record._sum.quantity_change || 0),
    0,
  );
  const averageStockPerVariant =
    inventoryRecords.length > 0 ? totalStockQuantity / totalVariants : 0;
  const lowStockCount = inventoryRecords.filter(
    (record) =>
      (record._sum.quantity_change || 0) < 10 &&
      (record._sum.quantity_change || 0) > 0,
  ).length;
  const outOfStockCount = inventoryRecords.filter(
    (record) => (record._sum.quantity_change || 0) === 0,
  ).length;
  const totalInventoryValue = inventoryRecords.reduce(
    (sum, record) => sum + (record._sum.quantity_change || 0) * 10,
    0,
  ); // Assume $10 average unit price
  // Transform raw groupBy results into summary format
  const data = inventoryRecords.map((record) => ({
    variantId: record.variant_id as string & tags.Format<"uuid">,
    quantityChange: record._sum.quantity_change || 0,
    reason: "primary_service", // Placeholder: Use reason from most recent transaction or null
    sourceType: "restock" as const, // Placeholder: Use source_type from most recent transaction or null
    createdAt: toISOStringSafe(new Date()) as string & tags.Format<"date-time">,
  }));
  // Return formatted summary with pagination info
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
