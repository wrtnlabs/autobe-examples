import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderReturn } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderReturn";

export async function getShoppingMallOrdersOrderNumberReturnsId(props: {
  orderNumber: string;
  id: string;
}): Promise<IShoppingMallOrderReturn> {
  // First, find the order by order_number
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_number: props.orderNumber,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Then find the return record for this order
  const returnRecord =
    await MyGlobal.prisma.shopping_mall_order_returns.findFirst({
      where: {
        id: props.id,
        shopping_mall_order_id: order.id,
      },
    });

  if (!returnRecord) {
    throw new HttpException("Return not found", 404);
  }

  // Since IShoppingMallOrderReturn is defined as string in the DTO,
  // return the return ID as string to match the expected type
  return returnRecord.id;
}
