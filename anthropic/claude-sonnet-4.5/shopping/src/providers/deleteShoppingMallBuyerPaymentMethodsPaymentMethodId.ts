import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function deleteShoppingMallBuyerPaymentMethodsPaymentMethodId(props: {
  buyer: BuyerPayload;
  paymentMethodId: string & tags.Format<"uuid">;
}): Promise<void> {
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
      where: { id: props.paymentMethodId },
    });

  if (!paymentMethod) {
    throw new HttpException("Payment method not found", 404);
  }

  if (paymentMethod.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_payment_methods.delete({
    where: { id: props.paymentMethodId },
  });
}
