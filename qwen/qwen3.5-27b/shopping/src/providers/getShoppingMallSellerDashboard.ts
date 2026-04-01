import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboard";
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
}): Promise<IShoppingMallDashboard> {
  // Count order items for this seller
  const orderItemsCount = await MyGlobal.prisma.shopping_mall_order_items.count(
    {
      where: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  );
  // Count pending cancellation requests for seller's order items
  const pendingCancellationCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    });
  // Count pending refund requests for seller's order items
  const pendingRefundCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
          deleted_at: null,
        },
      },
    });
  return {
    order_items_count: orderItemsCount,
    pending_cancellation_count: pendingCancellationCount,
    pending_refund_count: pendingRefundCount,
  };
}
