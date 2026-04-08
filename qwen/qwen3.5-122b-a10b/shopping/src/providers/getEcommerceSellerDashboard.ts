import { IEcommerceShopDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShopDashboard";
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

export async function getEcommerceSellerDashboard(props: {
  seller: SellerPayload;
}): Promise<IEcommerceShopDashboard.ISummary> {
  // 1. Product Count - all active products owned by seller
  const productCount = await MyGlobal.prisma.ecommerce_products.count({
    where: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // 2. Order Item Count - all order items for seller's products
  const orderItemCount = await MyGlobal.prisma.ecommerce_order_items.count({
    where: {
      productVariant: {
        product: {
          seller_id: props.seller.id,
        },
      },
    },
  });
  // 3. Pending Cancellation Requests Count
  const pendingCancellationCount =
    await MyGlobal.prisma.ecommerce_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            product: {
              seller_id: props.seller.id,
            },
          },
        },
      },
    });
  // 4. Pending Refund Requests Count
  const pendingRefundCount =
    await MyGlobal.prisma.ecommerce_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          productVariant: {
            product: {
              seller_id: props.seller.id,
            },
          },
        },
      },
    });
  return {
    product_count: productCount,
    order_item_count: orderItemCount,
    pending_cancellation_request_count: pendingCancellationCount,
    pending_refund_request_count: pendingRefundCount,
  } satisfies IEcommerceShopDashboard.ISummary;
}
