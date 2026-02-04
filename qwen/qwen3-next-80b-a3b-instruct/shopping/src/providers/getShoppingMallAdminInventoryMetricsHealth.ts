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
import { IShoppingMallInventoryHealth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHealth";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInventoryMetricsHealth(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallInventoryHealth> {
  // Get current stock levels across all variants
  const stockSummary =
    await MyGlobal.prisma.shopping_mall_inventory_records.groupBy({
      by: ["variant_id"],
      _sum: {
        quantity_change: true,
      },
      where: {},
    });
  // Calculate total current stock
  const currentStock = stockSummary.reduce(
    (sum, record) => sum + (record._sum?.quantity_change || 0),
    0,
  );
  // Count restock events in the past 30 days
  // Convert to ISO string for comparison (proper date format)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = toISOStringSafe(thirtyDaysAgo);
  const restockEvents =
    await MyGlobal.prisma.shopping_mall_inventory_records.count({
      where: {
        reason: {
          in: [
            "Supplier Delivery",
            "Returns Received",
            "Manual Adjustment",
            "Damaged Goods Replacement",
          ],
        },
        created_at: {
          gte: thirtyDaysAgoISO,
        },
      },
    });
  // Count variants with zero or negative stock
  const outOfStockVariants = stockSummary.filter(
    (record) => (record._sum?.quantity_change || 0) <= 0,
  );
  const outOfStockCount = outOfStockVariants.length;
  // Calculate adjustment accuracy percentage
  const totalAdjustments =
    await MyGlobal.prisma.shopping_mall_inventory_records.count({
      where: {},
    });
  const nonOtherAdjustments =
    await MyGlobal.prisma.shopping_mall_inventory_records.count({
      where: {
        reason: {
          not: "Other",
        },
      },
    });
  const adjustmentAccuracy =
    totalAdjustments > 0 ? (nonOtherAdjustments / totalAdjustments) * 100 : 0;
  // Calculate total unique variants
  const totalVariants = stockSummary.length;
  // Calculate component scores based on realistic normalization
  // For currentStockScore: Use 20% of total adjustments as reference maximum (conservative estimate)
  // This is a normalized 0-100 scale based on actual inventory volume
  const maxPossibleCurrentStock = totalAdjustments * 0.2; // Conservative estimate of maximum possible stock
  const currentStockScore = Math.min(
    100,
    Math.max(0, (currentStock / maxPossibleCurrentStock) * 100),
  );
  // For restockEventScore: Use maximum based on 30 days with 3 restocks per day
  const maxPossibleRestocks = 90; // 3 per day over 30 days
  const restockEventScore = Math.min(
    100,
    Math.max(0, (restockEvents / maxPossibleRestocks) * 100),
  );
  // For outOfStockScore: Higher score when fewer variants are out of stock
  const outOfStockScore =
    totalVariants > 0
      ? Math.min(
          100,
          Math.max(0, 100 - (outOfStockCount / totalVariants) * 100),
        )
      : 100;
  // For adjustmentAccuracyScore: Use the actual percentage
  const adjustmentAccuracyScore = adjustmentAccuracy;
  // Calculate composite health score using weights: 40%, 30%, 20%, 10%
  const healthScore =
    currentStockScore * 0.4 +
    restockEventScore * 0.3 +
    outOfStockScore * 0.2 +
    adjustmentAccuracyScore * 0.1;
  // Return result with proper types
  return {
    healthScore: healthScore as number & tags.Minimum<0> & tags.Maximum<100>,
    currentStock,
    restockEvents: restockEvents as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    outOfStockCount: outOfStockCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    adjustmentAccuracy: adjustmentAccuracy as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    currentStockScore: currentStockScore as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    restockEventScore: restockEventScore as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    outOfStockScore: outOfStockScore as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    adjustmentAccuracyScore: adjustmentAccuracyScore as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    totalVariants: totalVariants as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    totalAdjustments: totalAdjustments as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };
}
