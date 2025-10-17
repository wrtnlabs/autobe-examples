import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdStatusesStatusId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { seller, orderId, statusId } = props;

  // Verify the order exists and belongs to the seller, and is not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: orderId,
      shopping_mall_seller_id: seller.id,
      deleted_at: null,
    },
  });

  if (!order) {
    throw new HttpException("Order not found or access denied", 404);
  }

  // Verify the status record exists for the order
  const status = await MyGlobal.prisma.shopping_mall_order_statuses.findFirst({
    where: {
      id: statusId,
      shopping_mall_order_id: orderId,
    },
  });

  if (!status) {
    throw new HttpException("Order status not found", 404);
  }

  // Delete the order status record
  await MyGlobal.prisma.shopping_mall_order_statuses.delete({
    where: {
      id: statusId,
    },
  });
}
