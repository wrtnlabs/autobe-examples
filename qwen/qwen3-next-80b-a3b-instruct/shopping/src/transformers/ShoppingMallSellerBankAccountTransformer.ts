import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerBankAccountTransformer {
  export type Payload = Prisma.shopping_mall_seller_bank_accountsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        account_holder_name: true,
        bank_name: true,
        account_number: true,
        routing_number: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            currency: true,
            countryCode: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_seller_bank_accountsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerBankAccount> {
    return {
      bank_name: input.bank_name,
      account_number: input.account_number,
      routing_number: input.routing_number,
      account_holder_name: input.account_holder_name,
      account_type: input.account_status as "checking" | "savings" | "business",
      is_active: input.account_status === "active",
      currency: input.seller.currency,
      country_code: input.seller.countryCode,
    };
  }
}
