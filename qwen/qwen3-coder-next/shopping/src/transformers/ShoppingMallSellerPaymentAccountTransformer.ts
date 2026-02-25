import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerPaymentAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPaymentAccount";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerPaymentAccountTransformer {
  // Payload type for Prisma query results
  export type Payload = Prisma.shopping_mall_seller_payment_accountsGetPayload<
    ReturnType<typeof select>
  >;
  // select() function - must use 'select' not 'include'
  export function select() {
    return {
      select: {
        id: true,
        bank_name: true,
        account_number: true,
        account_holder_name: true,
        payment_processor_status: true,
        commission_rate: true,
        minimum_payout_threshold: true,
        currency: true,
        payout_schedule: true,
        last_payout_at: true,
        total_payout_amount: true,
        pending_payout_amount: true,
        auto_payout_enabled: true,
        tax_id: true,
        business_registration_number: true,
        verification_status: true,
        created_at: true,
        updated_at: true,
        seller_id: true,
      },
    } satisfies Prisma.shopping_mall_seller_payment_accountsFindManyArgs;
  }
  // transform() function - converts Prisma payload to DTO
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerPaymentAccount> {
    return {
      id: input.id,
      seller_id: input.seller_id,
      bank_name: input.bank_name ?? undefined,
      account_number: input.account_number ?? undefined,
      account_holder_name: input.account_holder_name ?? undefined,
      payment_processor_status: input.payment_processor_status,
      commission_rate: Number(input.commission_rate),
      minimum_payout_threshold: Number(input.minimum_payout_threshold),
      currency: input.currency,
      payout_schedule: input.payout_schedule,
      last_payout_at: input.last_payout_at
        ? input.last_payout_at.toISOString()
        : null,
      total_payout_amount: Number(input.total_payout_amount),
      pending_payout_amount: Number(input.pending_payout_amount),
      auto_payout_enabled: input.auto_payout_enabled,
      tax_id: input.tax_id ?? undefined,
      business_registration_number:
        input.business_registration_number ?? undefined,
      verification_status: input.verification_status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
