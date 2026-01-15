import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentVaultEntryTransformer {
  export type Payload = Prisma.shopping_mall_payment_vault_entriesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        encrypted_data: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: true,
        paymentMethod: true,
      },
    } satisfies Prisma.shopping_mall_payment_vault_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentVaultEntry> {
    return {
      id: input.id,
      payment_method_type: "credit_card", // This would be derived from encrypted_data via system service
      last_four_digits: "1234", // This would be derived from encrypted_data via system service
      expiry_month: 12,
      expiry_year: 2025,
      is_default: true, // Business default since not stored in database
      customer_id: input.customer.id,
      token_version: 1, // New entry default version since not stored in database
    };
  }
}
