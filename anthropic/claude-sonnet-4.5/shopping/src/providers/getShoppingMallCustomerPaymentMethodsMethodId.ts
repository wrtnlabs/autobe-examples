import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerPaymentMethodsMethodId(props: {
  customer: CustomerPayload;
  methodId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentMethod> {
  const { customer, methodId } = props;

  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUniqueOrThrow({
      where: {
        id: methodId,
      },
    });

  if (paymentMethod.deleted_at !== null) {
    throw new HttpException("Payment method not found", 404);
  }

  if (paymentMethod.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own payment methods",
      403,
    );
  }

  return {
    id: paymentMethod.id as string & tags.Format<"uuid">,
    payment_type: paymentMethod.payment_type,
  };
}
