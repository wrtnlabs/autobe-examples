import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallPaymentAttemptTransformer } from "../transformers/ShoppingMallPaymentAttemptTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerPaymentAttemptsPaymentAttemptId(props: {
  customer: CustomerPayload;
  paymentAttemptId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentAttempt> {
  const paymentAttempt =
    await MyGlobal.prisma.shopping_mall_payment_attempts.findUniqueOrThrow({
      where: {
        id: props.paymentAttemptId,
      },
      select: {
        id: true,
        shopping_mall_customer_id: true,
      },
    });
  if (paymentAttempt.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  const found =
    await MyGlobal.prisma.shopping_mall_payment_attempts.findUniqueOrThrow({
      where: {
        id: props.paymentAttemptId,
      },
      ...ShoppingMallPaymentAttemptTransformer.select(),
    });
  return await ShoppingMallPaymentAttemptTransformer.transform(found);
}
