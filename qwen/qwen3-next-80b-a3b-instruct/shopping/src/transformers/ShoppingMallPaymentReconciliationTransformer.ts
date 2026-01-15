import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentReconciliation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliation";
import { IShoppingMallPaymentReconciliationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationMetadata";
import { IShoppingMallPaymentReconciliationDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationDetails";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallPaymentReconciliationMetadataTransformer } from "./ShoppingMallPaymentReconciliationMetadataTransformer";

export namespace ShoppingMallPaymentReconciliationTransformer {
  export type Payload = Prisma.shopping_mall_payment_reconciliationGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        job_id: true,
        job_date: true,
        status: true,
        total_payments_expected: true,
        total_payments_received: true,
        difference_amount: true,
        discrepancy_count: true,
        description: true,
        created_at: true,
        updated_at: true,
        payment: true,
        gatewayLog: true,
      },
    } satisfies Prisma.shopping_mall_payment_reconciliationFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentReconciliation> {
    const metadata = input.description
      ? await ShoppingMallPaymentReconciliationMetadataTransformer.transform({
          id: input.id,
          status: input.status as
            | "pending"
            | "in_progress"
            | "completed"
            | "failed",
          startTime: toISOStringSafe(input.job_date),
          endTime: null,
          processedCount: input.total_payments_expected,
          failedCount: input.discrepancy_count,
          summary: input.description,
          details: "", // IShoppingMallPaymentReconciliationDetails is type string
        })
      : undefined;
    return {
      id: input.id,
      start_date: toISOStringSafe(input.job_date),
      end_date: toISOStringSafe(new Date("2300-01-01")),
      total_transactions: input.total_payments_expected,
      matched_transactions: input.total_payments_received,
      mismatched_transactions: input.discrepancy_count,
      pending_transactions:
        input.total_payments_expected -
        input.total_payments_received -
        input.discrepancy_count,
      total_reconciled_amount:
        input.total_payments_received - input.difference_amount,
      total_discrepancy_amount: input.difference_amount,
      status: input.status as
        | "successful"
        | "failed"
        | "pending"
        | "manual_review",
      processed_by: input.job_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      reconciliation_metadata: metadata,
    };
  }
}
