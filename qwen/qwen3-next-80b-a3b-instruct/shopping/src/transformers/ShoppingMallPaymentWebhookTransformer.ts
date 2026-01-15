import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentWebhookTransformer {
  export type Payload = Prisma.shopping_mall_payment_webhooksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        event_types: true,
        created_at: true,
        status: true,
        delivery_count: true,
        last_delivery_at: true,
        last_failure_reason: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_webhooksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentWebhook> {
    return {
      id: input.id,
      endpoint: input.url,
      isActive: input.status === "active",
      eventTypes: typia.assert<
        (
          | "payment.success"
          | "payment.failed"
          | "refund.processed"
          | "refund.failed"
          | "dispute.opened"
          | "dispute.won"
          | "dispute.lost"
          | "chargeback.initiated"
          | "chargeback.resolved"
          | "subscription.renewal"
          | "subscription.cancelled"
        )[]
      >(
        input.event_types
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      ),
      createdAt: toISOStringSafe(input.created_at),
      lastDeliveryAttempt:
        input.last_delivery_at !== null
          ? toISOStringSafe(input.last_delivery_at)
          : null,
      deliveryFailureCount: input.delivery_count,
      secretKey: null,
      metadata: null,
    };
  }
}
