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

export async function getShoppingMallSellerDashboardSummary(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallDashboard.ISummary> {
  const productsCount = await MyGlobal.prisma.shopping_mall_products.count({
    where: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const orderItemsCount = await MyGlobal.prisma.shopping_mall_order_items.count(
    {
      where: {
        shopping_mall_seller_id: props.seller.id,
      },
    },
  );
  const pendingCancellationsCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          product: {
            seller_id: props.seller.id,
          },
        },
      },
    });
  const pendingRefundsCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          product: {
            seller_id: props.seller.id,
          },
        },
      },
    });
  return {
    products_count: productsCount,
    order_items_count: orderItemsCount,
    pending_cancellations_count: pendingCancellationsCount,
    pending_refunds_count: pendingRefundsCount,
  } satisfies IShoppingMallDashboard.ISummary;
}
