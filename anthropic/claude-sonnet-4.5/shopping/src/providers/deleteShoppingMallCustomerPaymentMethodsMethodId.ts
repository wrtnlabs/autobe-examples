import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerPaymentMethodsMethodId(props: {
  customer: CustomerPayload;
  methodId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, methodId } = props;

  // Fetch the payment method to verify existence and ownership
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUniqueOrThrow({
      where: { id: methodId },
      select: {
        shopping_mall_customer_id: true,
        deleted_at: true,
      },
    });

  // Verify ownership - customer can only delete their own payment methods
  if (paymentMethod.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own payment methods",
      403,
    );
  }

  // Check if already deleted - treat as not found
  if (paymentMethod.deleted_at !== null) {
    throw new HttpException("Payment method not found", 404);
  }

  // Perform soft delete
  await MyGlobal.prisma.shopping_mall_payment_methods.update({
    where: { id: methodId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
