import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentGatewayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayLog";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentGatewayLogTransformer {
  export type Payload = Prisma.shopping_mall_payment_gateway_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        request_payload: true,
        response_payload: true,
        error_code: true,
        response_time_ms: true,
        retry_attempt: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        paymentIntent: true,
        shopping_mall_payment_reconciliation: true,
      },
    } satisfies Prisma.shopping_mall_payment_gateway_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentGatewayLog> {
    return {
      id: input.id,
      status: typia.assert<
        "pending" | "success" | "failed" | "declined" | "timeout"
      >(input.paymentIntent.status),
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
