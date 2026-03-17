import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ISellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerDashboard";
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
}): Promise<ISellerDashboard> {
  const [
    productCount,
    orderItemCount,
    pendingCancellationCount,
    pendingRefundCount,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_mall_products.count({
      where: {
        shopping_seller_id: props.seller.id,
        deleted: false,
      },
    }),
    MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_seller_id: props.seller.id,
      },
    }),
    MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        responded_by_seller_id: props.seller.id,
        status: "PENDING",
      },
    }),
    MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        responded_by_seller_id: props.seller.id,
        status: "PENDING",
      },
    }),
  ]);
  return {
    productCount,
    orderItemCount,
    pendingCancellationCount,
    pendingRefundCount,
  };
}
