import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function putShoppingMallBuyerPaymentMethodsPaymentMethodId(props: {
  buyer: BuyerPayload;
  paymentMethodId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentMethod.IUpdate;
}): Promise<IShoppingMallPaymentMethod> {
  const existing =
    await MyGlobal.prisma.shopping_mall_payment_methods.findUnique({
      where: { id: props.paymentMethodId },
    });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Payment method not found", 404);
  }

  if (existing.shopping_mall_buyer_id !== props.buyer.id) {
    throw new HttpException("Forbidden", 403);
  }

  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_payment_methods.updateMany({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        id: { not: props.paymentMethodId },
        deleted_at: null,
      },
      data: { is_default: false },
    });
  }

  const updated = await MyGlobal.prisma.shopping_mall_payment_methods.update({
    where: { id: props.paymentMethodId },
    data: {
      ...(props.body.billing_name !== undefined && {
        billing_name: props.body.billing_name,
      }),
      ...(props.body.billing_postal_code !== undefined && {
        billing_postal_code: props.body.billing_postal_code,
      }),
      ...(props.body.is_default !== undefined && {
        is_default: props.body.is_default,
      }),
    },
  });

  return {
    id: updated.id,
    shopping_mall_buyer_id: updated.shopping_mall_buyer_id,
    payment_type: updated.payment_type,
    provider: updated.provider,
    provider_token: updated.provider_token,
    last_four_digits:
      updated.last_four_digits === null ? undefined : updated.last_four_digits,
    card_brand: updated.card_brand === null ? undefined : updated.card_brand,
    expiry_month:
      updated.expiry_month === null ? undefined : updated.expiry_month,
    expiry_year: updated.expiry_year === null ? undefined : updated.expiry_year,
    billing_name: updated.billing_name,
    billing_postal_code:
      updated.billing_postal_code === null
        ? undefined
        : updated.billing_postal_code,
    is_default: updated.is_default,
    is_verified: updated.is_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
