import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentTransformer {
  export type Payload = Prisma.shopping_mall_paymentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        amount: true,
        currency: true,
        provider: true,
        provider_reference: true,
        status: true,
        paid_at: true,
        error_code: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderForPayment: true,
      },
    } satisfies Prisma.shopping_mall_paymentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPayment> {
    return {
      id: input.id,
      amount: input.amount,
      currency: input.currency,
      provider: input.provider,
      provider_reference: input.provider_reference,
      status: input.status,
      paid_at: input.paid_at ? input.paid_at.toISOString() : null,
      error_code: input.error_code ?? null,
      error_message: input.error_message ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
