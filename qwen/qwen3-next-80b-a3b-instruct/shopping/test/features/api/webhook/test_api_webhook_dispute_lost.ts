import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";
export async function test_api_webhook_dispute_lost(
  connection: api.IConnection,
): Promise<void> {
  // Generate realistic dispute.lost webhook event payload
  const disputeLostEvent: IShoppingMallPaymentWebhook = {
    id: typia.random<string & tags.Format<"uuid">>(),
    endpoint: RandomGenerator.substring("https://api.merchant.com/webhook/"), // Valid URI using RandomGenerator
    isActive: true,
    eventTypes: ["dispute.lost", "payment.success"], // Includes dispute.lost and at least one other common event type
    createdAt: new Date().toISOString(),
    lastDeliveryAttempt: new Date().toISOString(),
    deliveryFailureCount: 0,
    secretKey: "", // Optional field, empty string acceptable per schema
    metadata: '{"integrationId":"stripe-prod-v4","env":"production"}', // Required string type per IShoppingMallWebhookMetadata definition
  };
  // Validate the generated payload exactly matches the schema
  typia.assert(disputeLostEvent);
  // Execute the webhook processing API call
  await api.functional.shoppingMall.webhooks.create(connection, {
    body: disputeLostEvent satisfies IShoppingMallPaymentWebhook,
  });
  // The API returns void, so no response validation is needed
  // Success is confirmed by the absence of runtime error and successful compilation
}
