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

export async function postShoppingMallBuyerPaymentMethodsPaymentMethodIdSetDefault(props: {
  buyer: BuyerPayload;
  paymentMethodId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentMethod> {
  const existingPaymentMethod =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
      where: { id: props.paymentMethodId },
    });

  if (!existingPaymentMethod) {
    throw new HttpException("Payment method not found", 404);
  }

  if (existingPaymentMethod.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updatedPaymentMethod = await MyGlobal.prisma.$transaction(
    async (tx) => {
      await tx.shopping_mall_payment_methods.updateMany({
        where: {
          shopping_mall_buyer_id: props.buyer.id,
          is_default: true,
        },
        data: {
          is_default: false,
        },
      });

      return await tx.shopping_mall_payment_methods.update({
        where: { id: props.paymentMethodId },
        data: {
          is_default: true,
        },
      });
    },
  );

  return {
    id: updatedPaymentMethod.id,
    shopping_mall_buyer_id: updatedPaymentMethod.shopping_mall_buyer_id,
    payment_type: updatedPaymentMethod.payment_type,
    provider: updatedPaymentMethod.provider,
    provider_token: updatedPaymentMethod.provider_token,
    last_four_digits:
      updatedPaymentMethod.last_four_digits === null
        ? undefined
        : updatedPaymentMethod.last_four_digits,
    card_brand:
      updatedPaymentMethod.card_brand === null
        ? undefined
        : updatedPaymentMethod.card_brand,
    expiry_month:
      updatedPaymentMethod.expiry_month === null
        ? undefined
        : updatedPaymentMethod.expiry_month,
    expiry_year:
      updatedPaymentMethod.expiry_year === null
        ? undefined
        : updatedPaymentMethod.expiry_year,
    billing_name: updatedPaymentMethod.billing_name,
    billing_postal_code:
      updatedPaymentMethod.billing_postal_code === null
        ? undefined
        : updatedPaymentMethod.billing_postal_code,
    is_default: updatedPaymentMethod.is_default,
    is_verified: updatedPaymentMethod.is_verified,
    created_at: toISOStringSafe(updatedPaymentMethod.created_at),
    updated_at: toISOStringSafe(updatedPaymentMethod.updated_at),
    deleted_at:
      updatedPaymentMethod.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedPaymentMethod.deleted_at),
  };
}
