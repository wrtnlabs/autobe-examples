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

export async function getShoppingMallSellerDashboardCancellationRefund(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallDashboard.ICancellationRefund> {
  const cancellationPendingCount =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    });
  const refundPendingCount =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
        orderItem: {
          shopping_mall_seller_id: props.seller.id,
        },
      },
    });
  return {
    cancellationPendingCount: cancellationPendingCount,
    refundPendingCount: refundPendingCount,
  };
}
