import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
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

export async function getShoppingMallSellerSellersMeDashboard(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSellerDashboard> {
  // Product Count - active products (not soft-deleted)
  const productCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // Order Item Count - all order items for this seller's products
  const orderItemCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      shopping_mall_seller_id: props.seller.id,
    },
  });
  // Pending Cancellations - join with order_items to filter by seller
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    });
  // Pending Refunds - table doesn't exist in current schema
  // TODO: Implement when shopping_mall_refund_requests table is added
  const pendingRefunds = 0;
  return {
    productCount,
    orderItemCount,
    pendingCancellations,
    pendingRefunds,
  } satisfies IShoppingMallSellerDashboard;
}
