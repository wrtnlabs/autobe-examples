import { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommercePaymentTransactionAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_payment_transactionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        payment_method: true,
        amount: true,
        currency: true,
        gateway_transaction_id: true,
        gateway_name: true,
        status: true,
        failure_reason: true,
        authorization_code: true,
        retry_count: true,
        gateway_response_data: true,
        created_at: true,
        updated_at: true,
        completed_at: true,
        failed_at: true,
      },
    } satisfies Prisma.ecommerce_payment_transactionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePaymentTransaction.ISummary> {
    return {
      id: input.id,
      payment_method: input.payment_method,
      amount: input.amount,
      currency: input.currency,
      gateway_name: input.gateway_name,
      status: input.status,
      authorization_code: input.authorization_code ?? null,
      created_at: toISOStringSafe(input.created_at),
      completed_at: input.completed_at
        ? toISOStringSafe(input.completed_at)
        : null,
      failed_at: input.failed_at ? toISOStringSafe(input.failed_at) : null,
    };
  }
}
