import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderCode(props: {
  customer: CustomerPayload;
  orderCode: string;
}): Promise<void> {
  const { customer, orderCode } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: {
      order_code: orderCode,
    },
  });

  if (!order) {
    throw new HttpException(`Order with code ${orderCode} not found`, 404);
  }

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      `Unauthorized: You can only delete your own orders`,
      403,
    );
  }

  await MyGlobal.prisma.shopping_mall_orders.delete({
    where: {
      order_code: orderCode,
    },
  });
}
