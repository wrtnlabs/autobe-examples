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
  // Count products owned by this seller (non-deleted)
  const productCount = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      seller_id: sellerId,
      deleted_at: null,
    },
  });
  // Count order items for seller's products
  const orderItemCount = await MyGlobal.prisma.ecommerce_mall_order_items.count(
    {
      where: {
        product: {
          seller_id: sellerId,
        },
      },
    },
  );
  // Count pending cancellation requests for seller's products
  const pendingCancellationRequestCount =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          product: {
            seller_id: sellerId,
          },
        },
      },
    });
  // Count pending refund requests for seller's products
  const pendingRefundRequestCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          product: {
            seller_id: sellerId,
          },
        },
      },
    });
  return {
    productCount,
    orderItemCount,
    pendingCancellationRequestCount,
    pendingRefundRequestCount,
  };
}
