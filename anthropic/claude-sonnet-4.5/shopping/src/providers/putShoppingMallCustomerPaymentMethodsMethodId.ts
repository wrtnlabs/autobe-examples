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

export async function putShoppingMallCustomerPaymentMethodsMethodId(props: {
  customer: CustomerPayload;
  methodId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentMethod.IUpdate;
}): Promise<IShoppingMallPaymentMethod> {
  const { customer, methodId, body } = props;

  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUniqueOrThrow({
      where: { id: methodId },
    });

  if (paymentMethod.shopping_mall_customer_id !== customer.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own payment methods",
      403,
    );
  }

  if (
    body.shopping_mall_billing_address_id !== undefined &&
    body.shopping_mall_billing_address_id !== null
  ) {
    const billingAddress =
      await MyGlobal.prisma.shopping_mall_addresses.findFirst({
        where: {
          id: body.shopping_mall_billing_address_id,
          shopping_mall_customer_id: customer.id,
          deleted_at: null,
        },
      });

    if (!billingAddress) {
      throw new HttpException(
        "Billing address not found or does not belong to you",
        404,
      );
    }
  }

  if (body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_payment_methods.updateMany({
      where: {
        shopping_mall_customer_id: customer.id,
        id: { not: methodId },
        deleted_at: null,
      },
      data: {
        is_default: false,
      },
    });
  }

  const finalExpiryMonth =
    body.card_expiry_month !== undefined
      ? body.card_expiry_month
      : paymentMethod.card_expiry_month;

  const finalExpiryYear =
    body.card_expiry_year !== undefined
      ? body.card_expiry_year
      : paymentMethod.card_expiry_year;

  let calculatedIsExpired = paymentMethod.is_expired;

  if (finalExpiryMonth !== null && finalExpiryYear !== null) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    calculatedIsExpired =
      finalExpiryYear < currentYear ||
      (finalExpiryYear === currentYear && finalExpiryMonth < currentMonth);
  }

  const updated = await MyGlobal.prisma.shopping_mall_payment_methods.update({
    where: { id: methodId },
    data: {
      ...(body.shopping_mall_billing_address_id !== undefined && {
        shopping_mall_billing_address_id: body.shopping_mall_billing_address_id,
      }),
      ...(body.is_default !== undefined && {
        is_default: body.is_default,
      }),
      ...(body.card_expiry_month !== undefined && {
        card_expiry_month: body.card_expiry_month,
      }),
      ...(body.card_expiry_year !== undefined && {
        card_expiry_year: body.card_expiry_year,
      }),
      ...(body.nickname !== undefined && {
        nickname: body.nickname,
      }),
      is_expired: calculatedIsExpired,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    payment_type: updated.payment_type,
  };
}
