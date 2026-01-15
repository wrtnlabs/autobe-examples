import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";
export async function test_api_webhook_payment_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a payment.success webhook event payload
  const paymentEvent: IShoppingMallPaymentWebhook = {
    id: typia.random<string & tags.Format<"uuid">>(),
    endpoint: "https://api.example.com/webhook/payment",
    isActive: true,
    eventTypes: ["payment.success"],
    createdAt: new Date().toISOString(),
    lastDeliveryAttempt: new Date().toISOString(),
    deliveryFailureCount: 0,
    secretKey: RandomGenerator.alphaNumeric(64),
    metadata: undefined,
  };
  // Send the payment.success event to the webhook endpoint
  const webhookResponse = await api.functional.shoppingMall.webhooks.create(
    connection,
    {
      body: paymentEvent satisfies IShoppingMallPaymentWebhook,
    },
  );
  // Validate webhook processing succeeded (HTTP 200 OK with empty body)
  typia.assert(webhookResponse);
  // Check idempotency: send the same webhook event again
  const duplicateWebhookResponse =
    await api.functional.shoppingMall.webhooks.create(connection, {
      body: paymentEvent satisfies IShoppingMallPaymentWebhook,
    });
  // Validate duplicate processing also succeeded
  typia.assert(duplicateWebhookResponse);
}