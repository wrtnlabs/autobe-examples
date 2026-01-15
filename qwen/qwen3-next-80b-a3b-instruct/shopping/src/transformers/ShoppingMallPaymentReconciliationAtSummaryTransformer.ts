import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliation";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentReconciliationAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_reconciliationGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        job_date: true,
        job_id: true,
        total_payments_received: true,
        total_payments_expected: true,
        discrepancy_count: true,
        status: true,
        difference_amount: true,
        description: true,
        created_at: true,
        updated_at: true,
        payment: {
          select: {
            id: true,
          },
        },
        gatewayLog: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_payment_reconciliationFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentReconciliation.ISummary> {
    return {
      id: input.id,
      reconciliation_date: input.job_date.toISOString(),
      total_reconciled_amount: Number(input.total_payments_received),
      total_failed_reconciliations: input.discrepancy_count,
      total_processed_payments: input.total_payments_expected,
      successful_reconciliation_rate:
        input.total_payments_expected > 0
          ? (Number(input.total_payments_received) /
              input.total_payments_expected) *
            100
          : 0,
      average_processing_time_ms: 0,
      reconciliation_status: input.status as "completed" | "partial" | "failed",
      payment_method_count: 0,
      merchant_count: 0,
      batch_id: input.job_id,
      currency_code: "USD",
      reconciliation_type: "manual",
      reconciliation_id: input.job_id,
      payment_gateway_count: 0,
    };
  }
}
