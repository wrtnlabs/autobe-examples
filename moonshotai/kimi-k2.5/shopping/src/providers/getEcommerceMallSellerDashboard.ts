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
  const sellerId = props.seller.id;
  // Count total active products for this seller
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      seller_id: sellerId,
      deleted_at: null,
    },
  });
  // Count total order items for this seller's products
  const totalOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        seller_id: sellerId,
      },
    });
  // Count pending cancellation requests for this seller's order items
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          seller_id: sellerId,
        },
      },
    });
  // Count pending refund requests for this seller
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        status: "pending",
        seller_id: sellerId,
      },
    });
  return {
    totalProducts,
    totalOrderItems,
    pendingCancellationRequests,
    pendingRefundRequests,
  };
}
