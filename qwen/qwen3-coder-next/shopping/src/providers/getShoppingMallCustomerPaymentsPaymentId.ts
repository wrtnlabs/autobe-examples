import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallPaymentTransformer } from "../transformers/ShoppingMallPaymentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerPaymentsPaymentId(props: {
  customer: CustomerPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const payment =
    await MyGlobal.prisma.shopping_mall_payments.findUniqueOrThrow({
      where: { id: props.paymentId },
      ...ShoppingMallPaymentTransformer.select(),
    });
  // Authorization check: customer can only see their own payments
  if (payment.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallPaymentTransformer.transform(payment);
}
