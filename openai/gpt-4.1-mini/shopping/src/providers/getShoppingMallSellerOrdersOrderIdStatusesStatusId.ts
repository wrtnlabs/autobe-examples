import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderIdStatusesStatusId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatus> {
  const { seller, orderId, statusId } = props;

  // Check order exists and belongs to seller
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access forbidden", 404);
  }

  // Fetch the status for the order
  const status = await MyGlobal.prisma.shopping_mall_order_statuses.findFirst({
    where: {
      id: statusId,
      shopping_mall_order_id: orderId,
    },
  });
  if (!status) {
    throw new HttpException("Order status not found", 404);
  }

  return {
    id: status.id,
    shopping_mall_order_id: status.shopping_mall_order_id,
    status: status.status,
    status_changed_at: toISOStringSafe(status.status_changed_at),
  };
}
