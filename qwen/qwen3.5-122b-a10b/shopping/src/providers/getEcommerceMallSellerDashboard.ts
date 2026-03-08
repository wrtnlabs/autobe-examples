import { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
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
}): Promise<IEcommerceMallDashboard> {
  // Count active products
  const activeProductCount =
    await MyGlobal.prisma.ecommerce_mall_products.count({
      where: {
        seller_id: props.seller.id,
        status: "active",
        deleted_at: null,
      },
    });
  // Count order items for seller's products
  const orderItemCount = await MyGlobal.prisma.ecommerce_mall_order_items.count(
    {
      where: {
        productVariant: {
          product: {
            seller_id: props.seller.id,
          },
        },
      },
    },
  );
  // Count pending cancellation requests
  const pendingCancellationCount =
    await MyGlobal.prisma.ecommerce_mall_order_item_cancellation_requests.count(
      {
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
      },
    );
  // Count pending refund requests
  const pendingRefundCount =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.count({
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
    active_product_count: activeProductCount,
    order_item_count: orderItemCount,
    pending_cancellation_request_count: pendingCancellationCount,
    pending_refund_request_count: pendingRefundCount,
  } satisfies IEcommerceMallDashboard;
}
