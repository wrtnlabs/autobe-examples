import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentBatchJobLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentBatchJobLogTransformer {
  export type Payload = Prisma.shopping_mall_payment_batch_job_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        job_type: true,
        status: true,
        job_duration_ms: true,
        error_message: true,
        metadata: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_batch_job_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentBatchJobLog> {
    return {
      id: input.id,
      job_id: input.id,
      status: input.status as IShoppingMallPaymentBatchJobLog["status"],
      total_payments: 0,
      successful_payments: 0,
      failed_payments: 0,
      started_at: input.created_at.toISOString(),
      job_type: input.job_type as IShoppingMallPaymentBatchJobLog["job_type"],
      created_by: "system",
      server_id: "00000000-0000-0000-0000-000000000000",
      worker_id: "00000000-0000-0000-0000-000000000000",
      payment_gateway: "unknown",
      environment: "production",
      error_code: "system-mock",
      error_message: input.error_message ?? undefined,
    };
  }
}
