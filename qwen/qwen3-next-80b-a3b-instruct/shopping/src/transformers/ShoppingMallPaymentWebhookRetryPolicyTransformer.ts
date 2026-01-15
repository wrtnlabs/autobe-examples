import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentWebhookRetryPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookRetryPolicy";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentWebhookRetryPolicyTransformer {
  export type Payload = Prisma.shopping_mall_payment_webhooksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        event_types: true,
        status: true,
        delivery_count: true,
        last_delivery_at: true,
        last_failure_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        retry_policy: true,
      },
    } satisfies Prisma.shopping_mall_payment_webhooksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentWebhookRetryPolicy> {
    return {
      maxRetries: input.retry_policy.maxRetries,
      backoffMultiplier: input.retry_policy.backoffMultiplier,
      timeoutSeconds: input.retry_policy.timeoutSeconds,
    };
  }
}
