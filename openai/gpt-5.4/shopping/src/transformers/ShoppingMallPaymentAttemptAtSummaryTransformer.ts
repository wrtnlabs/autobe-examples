import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentAttemptAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_attemptsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        amount: true,
        gateway_provider: true,
        gateway_reference: true,
        failure_reason: true,
        processed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_attemptsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentAttempt.ISummary> {
    return {
      id: input.id,
      status: input.status,
      amount: input.amount,
      gateway_provider: input.gateway_provider,
      gateway_reference: input.gateway_reference,
      failure_reason: input.failure_reason ?? null,
      processed_at: input.processed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
