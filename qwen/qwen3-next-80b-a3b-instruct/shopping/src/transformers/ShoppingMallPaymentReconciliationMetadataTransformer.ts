import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentReconciliationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationMetadata";
import { IShoppingMallPaymentReconciliationDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentReconciliationDetails";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentReconciliationMetadataTransformer {
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
  ): Promise<IShoppingMallPaymentReconciliationMetadata> {
    return {
      reconciliationId: input.id,
      status: input.status as
        | "pending"
        | "in_progress"
        | "completed"
        | "failed",
      startTime: input.job_date.toISOString(),
      endTime: undefined,
      processedCount: input.total_payments_expected,
      failedCount: input.total_payments_received,
      summary: input.description ?? "",
      details: undefined,
    };
  }
}
