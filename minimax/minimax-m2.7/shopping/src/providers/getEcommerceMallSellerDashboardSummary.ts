import { IEcommerceMallSellerDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboardSummary";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceMallSellerDashboardSummary(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSellerDashboardSummary> {
  const sellerId = props.seller.id;
  // Count total active products for this seller
  const productsCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      ecommerce_mall_seller_id: sellerId,
      deleted_at: null,
    },
  });
  // Count total order items with qualifying statuses
  const orderItemsCount =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        product: {
          ecommerce_mall_seller_id: sellerId,
        },
        status: {
          in: ["paid", "shipped", "delivered"],
        },
      },
    });
  // Count pending cancellation requests
  const pendingCancellationsCount =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        ecommerce_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  // Count pending refund requests
  const pendingRefundsCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        ecommerce_mall_seller_id: sellerId,
        status: "pending",
      },
    });
  return {
    products_count: productsCount,
    order_items_count: orderItemsCount,
    pending_cancellations_count: pendingCancellationsCount,
    pending_refunds_count: pendingRefundsCount,
  };
}
