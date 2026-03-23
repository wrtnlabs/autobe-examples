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
}): Promise<IEcommerceMallDashboard.ISummary> {
  const totalProducts = await MyGlobal.prisma.ecommerce_mall_products.count({
    where: {
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  const pendingCancellationRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        seller_id: props.seller.id,
        status: "pending",
      },
    });
  const pendingRefundRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        seller_id: props.seller.id,
        status: "pending",
      },
    });
  const totalOrderItemsSold =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        seller_id: props.seller.id,
      },
    });
  return {
    totalProducts,
    pendingCancellationRequests,
    pendingRefundRequests,
    totalOrderItemsSold,
  };
}
