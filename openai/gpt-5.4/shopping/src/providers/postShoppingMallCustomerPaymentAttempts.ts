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
import { ShoppingMallPaymentAttemptCollector } from "../collectors/ShoppingMallPaymentAttemptCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallPaymentAttemptTransformer } from "../transformers/ShoppingMallPaymentAttemptTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerPaymentAttempts(props: {
  customer: CustomerPayload;
  body: IShoppingMallPaymentAttempt.ICreate;
}): Promise<IShoppingMallPaymentAttempt> {
  if (props.body.amount <= 0) {
    throw new HttpException("Payment amount must be positive", 400);
  }
  const supportedGatewayProviders: readonly string[] = [
    "kakao_pay",
    "naver_pay",
    "tosspayments",
    "paypal",
    "stripe",
  ];
  if (
    supportedGatewayProviders.includes(props.body.gateway_provider) === false
  ) {
    throw new HttpException("Unsupported gateway provider", 400);
  }
  const created = await MyGlobal.prisma.shopping_mall_payment_attempts.create({
    data: await ShoppingMallPaymentAttemptCollector.collect({
      body: props.body,
      customer: props.customer,
    }),
    ...ShoppingMallPaymentAttemptTransformer.select(),
  });
  return await ShoppingMallPaymentAttemptTransformer.transform(created);
}
