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

export async function postShoppingMallSellerOrdersOrderIdStatuses(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderStatus.ICreate;
}): Promise<IShoppingMallOrderStatus> {
  const { seller, orderId, body } = props;

  // Verify the order exists and belongs to this seller and is not deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.deleted_at !== null) {
    throw new HttpException("Order is deleted", 404);
  }

  if (order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: seller does not own this order",
      403,
    );
  }

  const created = await MyGlobal.prisma.shopping_mall_order_statuses.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: orderId,
      status: body.status,
      status_changed_at: body.status_changed_at,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    status: created.status,
    status_changed_at: toISOStringSafe(
      created.status_changed_at,
    ) satisfies string & tags.Format<"date-time"> as string &
      tags.Format<"date-time">,
  };
}
