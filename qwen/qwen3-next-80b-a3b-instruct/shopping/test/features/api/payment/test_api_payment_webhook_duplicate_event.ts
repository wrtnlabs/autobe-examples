import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";
export async function test_api_payment_webhook_duplicate_event(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a unique webhook event payload
  const webhookEvent: IShoppingMallPaymentWebhook =
    typia.random<IShoppingMallPaymentWebhook>();
  // Step 2: First delivery of webhook event (initial creation)
  const firstResponse: IShoppingMallPaymentWebhook =
    await api.functional.shoppingMall.payment_webhooks.post(connection, {
      body: webhookEvent,
    });
  typia.assert(firstResponse);
  // Step 3: Second identical delivery of the same webhook event (idempotency test)
  const secondResponse: IShoppingMallPaymentWebhook =
    await api.functional.shoppingMall.payment_webhooks.post(connection, {
      body: webhookEvent,
    });
  typia.assert(secondResponse);
  // Step 4: Validate that both responses are identical in configuration (no state mutation)
  TestValidator.equals(
    "webhook core configuration should remain unchanged",
    {
      id: firstResponse.id,
      endpoint: firstResponse.endpoint,
      isActive: firstResponse.isActive,
      eventTypes: firstResponse.eventTypes,
      createdAt: firstResponse.createdAt,
      secretKey: firstResponse.secretKey,
      metadata: firstResponse.metadata,
    },
    {
      id: secondResponse.id,
      endpoint: secondResponse.endpoint,
      isActive: secondResponse.isActive,
      eventTypes: secondResponse.eventTypes,
      createdAt: secondResponse.createdAt,
      secretKey: secondResponse.secretKey,
      metadata: secondResponse.metadata,
    },
  );
  // Step 5: Validate that record ID is identical — confirming no duplicate record creation
  TestValidator.equals(
    "webhook record ID should be identical across duplicate deliveries",
    firstResponse.id,
    secondResponse.id,
  );
  // Step 6: Validate that delivery tracking fields were updated on second delivery — confirming proper idempotency mechanism
  TestValidator.notEquals(
    "lastDeliveryAttempt should be updated on duplicate delivery",
    firstResponse.lastDeliveryAttempt,
    secondResponse.lastDeliveryAttempt,
  );
  TestValidator.predicate(
    "deliveryFailureCount should be preserved or incremented (not reset)",
    () =>
      secondResponse.deliveryFailureCount >= firstResponse.deliveryFailureCount,
  );
  // Step 7: Validate that timestamp of lastDeliveryAttempt is chronologically correct (second response is more recent)
  TestValidator.predicate(
    "second delivery attempt time should be after first",
    () =>
      new Date(secondResponse.lastDeliveryAttempt).getTime() >
      new Date(firstResponse.lastDeliveryAttempt).getTime(),
  );
}
