import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function getShoppingMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSeller.IDashboard> {
  const sellerId = props.seller.id;
  // 1. Total products count
  const totalProductsCount = await MyGlobal.prisma.shopping_mall_products.count(
    {
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
    },
  );
  // 2. Total order items count
  const totalOrderItemsCount =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_seller_id: sellerId,
        deleted_at: null,
      },
    });
  // 3. Pending cancellation requests count
  const pendingCancellationRequestsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        shopping_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  // 4. Pending refund requests count (join through order_items)
  const pendingRefundRequestsCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_seller_id: sellerId,
        },
      },
    });
  // 5. Low stock variants count
  // Get all variants for seller's products with their inventory records
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        product: {
          shopping_mall_seller_id: sellerId,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        inventoryRecords: {
          select: {
            quantity_change: true,
          },
        },
      },
    });
  const lowStockThreshold = 10;
  const lowStockVariantsCount = variants.filter((variant) => {
    const stock = variant.inventoryRecords.reduce(
      (sum, record) => sum + record.quantity_change,
      0,
    );
    return stock < lowStockThreshold;
  }).length;
  return {
    totalProductsCount,
    totalOrderItemsCount,
    pendingCancellationRequestsCount,
    pendingRefundRequestsCount,
    lowStockVariantsCount,
  } satisfies IShoppingMallSeller.IDashboard;
}
