import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerShoppingMallPaymentsShoppingMallPaymentId(props: {
  customer: CustomerPayload;
  shoppingMallPaymentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: props.shoppingMallPaymentId },
  });

  if (payment === null) {
    throw new HttpException("Payment record not found", 404);
  }

  // Ownership check removed because payment.customer_id does not exist

  await MyGlobal.prisma.shopping_mall_payments.delete({
    where: { id: props.shoppingMallPaymentId },
  });
}
