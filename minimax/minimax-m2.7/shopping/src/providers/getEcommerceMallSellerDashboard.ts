import { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSellerDashboard> {
  // 1. Count total non-deleted products for the seller
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      ecommerce_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // 2. Count total order items containing the seller's products
  const totalOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        product: {
          ecommerce_mall_seller_id: props.seller.id,
        },
      },
    });
  // 3. Count pending cancellation requests for the seller
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        ecommerce_mall_seller_id: props.seller.id,
        status: "pending",
      },
    });
  // 4. Count pending refund requests for the seller
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        ecommerce_mall_seller_id: props.seller.id,
        status: "pending",
      },
    });
  return {
    total_products: totalProducts,
    total_order_items: totalOrderItems,
    pending_cancellations: pendingCancellations,
    pending_refunds: pendingRefunds,
  };
}
