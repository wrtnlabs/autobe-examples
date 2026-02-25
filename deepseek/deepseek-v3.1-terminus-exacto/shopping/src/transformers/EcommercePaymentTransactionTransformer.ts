import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommercePaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePaymentTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";

export namespace EcommercePaymentTransactionTransformer {
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
        order: EcommerceOrderAtSummaryTransformer.select(),
        customer: EcommerceCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_payment_transactionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePaymentTransaction> {
    return {
      id: input.id,
      payment_method: input.payment_method,
      amount: input.amount,
      currency: input.currency,
      gateway_transaction_id: input.gateway_transaction_id ?? null,
      gateway_name: input.gateway_name,
      status: input.status,
      failure_reason: input.failure_reason ?? null,
      authorization_code: input.authorization_code ?? null,
      retry_count: input.retry_count,
      gateway_response_data: input.gateway_response_data ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      completed_at: input.completed_at?.toISOString() ?? null,
      failed_at: input.failed_at?.toISOString() ?? null,
      order: input.order
        ? await EcommerceOrderAtSummaryTransformer.transform(input.order)
        : null,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
