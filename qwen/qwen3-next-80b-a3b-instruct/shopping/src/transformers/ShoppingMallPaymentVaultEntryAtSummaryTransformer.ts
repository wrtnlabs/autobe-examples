import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentVaultEntryAtSummaryTransformer {
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
        customer: {
          select: {
            id: true,
          },
        },
        paymentMethod: {
          select: {
            type: true,
            brand: true,
            is_default: true,
            storage_provider: true,
            security_level: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_vault_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentVaultEntry.ISummary> {
    return {
      id: input.id,
      customer_id: input.customer.id,
      payment_method_type: input.paymentMethod
        .type as IShoppingMallPaymentVaultEntry.ISummary["payment_method_type"],
      last_four_digit: input.paymentMethod.card_last_four,
      brand: input.paymentMethod.brand,
      is_default: input.paymentMethod.is_default,
      is_active: input.deleted_at === null,
      created_at: toISOStringSafe(input.created_at),
      storage_provider: input.paymentMethod.storage_provider,
      security_level: input.paymentMethod.security_level,
      last_used_at: toISOStringSafe(input.updated_at),
    };
  }
}
