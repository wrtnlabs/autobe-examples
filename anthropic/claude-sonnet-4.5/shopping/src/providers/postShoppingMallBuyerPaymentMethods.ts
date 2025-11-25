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

export async function postShoppingMallBuyerPaymentMethods(props: {
  buyer: BuyerPayload;
  body: IShoppingMallPaymentMethod.ICreate;
}): Promise<IShoppingMallPaymentMethod> {
  const paymentMethodId = v4();
  const now = new Date();

  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_payment_methods.updateMany({
      where: {
        shopping_mall_buyer_id: props.buyer.id,
        is_default: true,
        deleted_at: null,
      },
      data: {
        is_default: false,
        updated_at: now,
      },
    });
  }

  const created = await MyGlobal.prisma.shopping_mall_payment_methods.create({
    data: {
      id: paymentMethodId,
      shopping_mall_buyer_id: props.buyer.id,
      payment_type: props.body.payment_type,
      provider: props.body.provider,
      provider_token: props.body.provider_token,
      last_four_digits: props.body.last_four_digits ?? null,
      card_brand: props.body.card_brand ?? null,
      expiry_month: props.body.expiry_month ?? null,
      expiry_year: props.body.expiry_year ?? null,
      billing_name: props.body.billing_name,
      billing_postal_code: props.body.billing_postal_code ?? null,
      is_default: props.body.is_default ?? false,
      is_verified: true,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_buyer_id: created.shopping_mall_buyer_id,
    payment_type: created.payment_type,
    provider: created.provider,
    provider_token: created.provider_token,
    last_four_digits:
      created.last_four_digits === null ? undefined : created.last_four_digits,
    card_brand: created.card_brand === null ? undefined : created.card_brand,
    expiry_month:
      created.expiry_month === null ? undefined : created.expiry_month,
    expiry_year: created.expiry_year === null ? undefined : created.expiry_year,
    billing_name: created.billing_name,
    billing_postal_code:
      created.billing_postal_code === null
        ? undefined
        : created.billing_postal_code,
    is_default: created.is_default,
    is_verified: created.is_verified,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
