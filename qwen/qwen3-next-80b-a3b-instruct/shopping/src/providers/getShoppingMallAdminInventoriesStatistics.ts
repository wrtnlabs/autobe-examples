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
import { IShoppingMallInventoryStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStatistic";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInventoriesStatistics(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallInventoryStatistic> {
  // Query all inventory records - no filtering for deleted status since field doesn't exist in schema
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({});
  // If no records exist, return zeros for all metrics
  if (records.length === 0) {
    return {
      totalVariants: 0,
      totalQuantity: 0,
      averagePrice: 0,
      totalInventoryValue: 0,
    };
  }
  // Calculate total variants (distinct variant IDs)
  const totalVariants = new Set(records.map((r) => r.variant_id)).size;
  // Calculate total quantity using 'quantity_change'
  const totalQuantity = records.reduce((sum, r) => sum + r.quantity_change, 0);
  // Since there is no 'price' field, totalInventoryValue and averagePrice must be zero
  // The schema does not support price computation. The existing API contract requires
  // these fields, so return zero when price is unavailable.
  const totalInventoryValue = 0;
  const averagePrice = 0;
  return {
    totalVariants,
    totalQuantity,
    averagePrice,
    totalInventoryValue,
  };
}
