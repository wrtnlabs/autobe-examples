import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function getEcommerceMallSellerDashboardSummary(props: {
  seller: SellerPayload;
}): Promise<IEcommerceMallSeller.IDashboardSummary> {
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const totalOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        seller_id: props.seller.id,
      },
    });
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        status: "pending",
        orderItem: {
          seller_id: props.seller.id,
        },
      },
    });
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        status: "pending",
        orderItem: {
          seller_id: props.seller.id,
        },
      },
    });
  return {
    totalProducts,
    totalOrderItems,
    pendingCancellationRequests,
    pendingRefundRequests,
  };
}
