import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerPaymentAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPaymentAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerPaymentAccountTransformer } from "../transformers/ShoppingMallSellerPaymentAccountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerPaymentAccount(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerPaymentAccount.IUpdate;
}): Promise<IShoppingMallSellerPaymentAccount> {
  const updated =
    await MyGlobal.prisma.shopping_mall_seller_payment_accounts.update({
      where: { seller_id: props.seller.id },
      data: {
        bank_name: props.body.bank_name ?? null,
        account_number: props.body.account_number ?? null,
        account_holder_name: props.body.account_holder_name ?? null,
        payment_processor_status: props.body.payment_processor_status,
        commission_rate: props.body.commission_rate,
        minimum_payout_threshold: props.body.minimum_payout_threshold,
        currency: props.body.currency,
        payout_schedule: props.body.payout_schedule,
        auto_payout_enabled: props.body.auto_payout_enabled,
        tax_id: props.body.tax_id ?? null,
        business_registration_number:
          props.body.business_registration_number ?? null,
        verification_status: props.body.verification_status,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      ...ShoppingMallSellerPaymentAccountTransformer.select(),
    });
  return await ShoppingMallSellerPaymentAccountTransformer.transform(updated);
}
