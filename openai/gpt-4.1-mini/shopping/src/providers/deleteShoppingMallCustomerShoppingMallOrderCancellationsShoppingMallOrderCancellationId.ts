import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallOrderCancellationsShoppingMallOrderCancellationId(props: {
  customer: CustomerPayload;
  shoppingMallOrderCancellationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const cancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellations.findUnique({
      where: { id: props.shoppingMallOrderCancellationId },
      select: { id: true, shopping_mall_customer_id: true },
    });

  if (!cancellation) {
    throw new HttpException("Order cancellation request not found", 404);
  }

  if (cancellation.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_order_cancellations.delete({
    where: { id: props.shoppingMallOrderCancellationId },
  });
}
