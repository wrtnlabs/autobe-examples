import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderCodeItemsItemId(props: {
  admin: AdminPayload;
  orderCode: string;
  itemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, orderCode, itemId } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { order_code: orderCode },
    select: { id: true, total_amount: true },
  });

  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: itemId },
      select: { shopping_mall_order_id: true, total_price: true },
    });

  if (orderItem.shopping_mall_order_id !== order.id) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      400,
    );
  }

  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: itemId },
  });

  const remainingSum =
    await MyGlobal.prisma.shopping_mall_order_items.aggregate({
      _sum: { total_price: true },
      where: { shopping_mall_order_id: order.id },
    });

  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: {
      total_amount: remainingSum._sum.total_price ?? 0,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
