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
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerAnalysisCartsAbandonment(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallCartItem> {
  // Base time for calculations (in ISO format)
  const now = toISOStringSafe(new Date());
  // Get abandonment window from configuration (assumed 24-72 hours)
  // We need to construct date thresholds as ISO strings for consistent type handling
  const minAgeHours = 24; // Minimum abandonment window: 24 hours
  const maxAgeHours = 72; // Maximum abandonment window: 72 hours
  // Convert hours to timestamp strings using toISOStringSafe
  const cutoffDate = toISOStringSafe(
    new Date(new Date(now).getTime() - minAgeHours * 60 * 60 * 1000),
  );
  const windowStartDate = toISOStringSafe(
    new Date(new Date(now).getTime() - maxAgeHours * 60 * 60 * 1000),
  );
  // Query for cart items without orders, older than cutoff
  const cartItems = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where: {
      order: null, // ✅ Corrected: Using relation name 'order' instead of 'order_id'
      created_at: { lt: cutoffDate },
    },
    select: {
      quantity: true,
      price_at_time: true,
      created_at: true,
    },
  });
  // Calculate metrics
  const totalCarts = cartItems.length;
  const totalAbandonedCarts = totalCarts;
  // Calculate average cart value
  const averageCartValue =
    totalCarts > 0
      ? cartItems.reduce(
          (sum, item) => sum + item.quantity * item.price_at_time,
          0,
        ) / totalCarts
      : 0;
  // Calculate abandonment rate: total abandoned carts / total carts created in period
  const totalCartsInWindow =
    await MyGlobal.prisma.shopping_mall_cart_items.count({
      where: {
        created_at: {
          gte: windowStartDate,
          lt: cutoffDate,
        },
      },
    });
  const abandonmentRate =
    totalCartsInWindow > 0 ? totalAbandonedCarts / totalCartsInWindow : 0;
  // Calculate average time to abandonment in hours
  // Convert now to Date object for calculation, then back to hours
  const nowDate = new Date(now);
  const totalHours = cartItems.reduce((sum, item) => {
    const diffMs = nowDate.getTime() - item.created_at.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return sum + diffHours;
  }, 0);
  const averageTimeToAbandonment = totalCarts > 0 ? totalHours / totalCarts : 0;
  // Return metrics with proper types
  return {
    totalAbandonedCarts,
    averageCartValue,
    abandonmentRate,
    averageTimeToAbandonment,
  };
}
