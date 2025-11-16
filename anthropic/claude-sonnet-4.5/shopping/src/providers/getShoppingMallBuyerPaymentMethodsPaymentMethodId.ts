import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function getShoppingMallBuyerPaymentMethodsPaymentMethodId(props: {
  buyer: BuyerPayload;
  paymentMethodId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentMethod> {
  const paymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
      where: {
        id: props.paymentMethodId,
      },
    });

  if (!paymentMethod || paymentMethod.deleted_at !== null) {
    throw new HttpException("Payment method not found", 404);
  }

  if (paymentMethod.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException(
      "Forbidden: You can only access your own payment methods",
      403,
    );
  }

  const buyerData = await MyGlobal.prisma.shopping_mall_buyers.findUnique({
    where: {
      id: paymentMethod.shopping_mall_buyer_id,
    },
  });

  return {
    id: paymentMethod.id as string & tags.Format<"uuid">,
    shopping_mall_buyer_id: paymentMethod.shopping_mall_buyer_id as string &
      tags.Format<"uuid">,
    buyer: buyerData
      ? {
          id: buyerData.id as string & tags.Format<"uuid">,
          email: buyerData.email as string & tags.Format<"email">,
          full_name: buyerData.full_name,
          phone_number:
            buyerData.phone_number === null
              ? undefined
              : buyerData.phone_number,
        }
      : undefined,
    payment_type: paymentMethod.payment_type,
    provider: paymentMethod.provider,
    provider_token: paymentMethod.provider_token,
    last_four_digits:
      paymentMethod.last_four_digits === null
        ? undefined
        : paymentMethod.last_four_digits,
    card_brand:
      paymentMethod.card_brand === null ? undefined : paymentMethod.card_brand,
    expiry_month:
      paymentMethod.expiry_month === null
        ? undefined
        : paymentMethod.expiry_month,
    expiry_year:
      paymentMethod.expiry_year === null
        ? undefined
        : paymentMethod.expiry_year,
    billing_name: paymentMethod.billing_name,
    billing_postal_code:
      paymentMethod.billing_postal_code === null
        ? undefined
        : paymentMethod.billing_postal_code,
    is_default: paymentMethod.is_default,
    is_verified: paymentMethod.is_verified,
    created_at: toISOStringSafe(paymentMethod.created_at),
    updated_at: toISOStringSafe(paymentMethod.updated_at),
    deleted_at: paymentMethod.deleted_at
      ? toISOStringSafe(paymentMethod.deleted_at)
      : undefined,
  };
}
