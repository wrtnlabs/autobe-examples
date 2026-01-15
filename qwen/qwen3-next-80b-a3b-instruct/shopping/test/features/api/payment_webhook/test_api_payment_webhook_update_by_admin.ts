import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallPaymentWebhookHeaders } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookHeaders";
import type { IShoppingMallPaymentWebhookRetryPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookRetryPolicy";
import type { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";
export async function test_api_payment_webhook_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a unique webhook ID (since create returns void and doesn't return ID)
  const webhookId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Create the webhook using UPDATE endpoint (this function acts as upsert)
  const webhookCreateBody: IShoppingMallPaymentWebhook.IUpdate = {
    endpoint: typia.random<string & tags.Format<"uri">>(),
    isActive: true,
    eventTypes: ["payment.success", "payment.failed", "refund.processed"],
  };
  // Use update endpoint to create webhook with generated ID
  const createdWebhook: IShoppingMallPaymentWebhook =
    await api.functional.shoppingMall.webhooks.update(connection, {
      id: webhookId,
      body: webhookCreateBody,
    });
  typia.assert(createdWebhook);
  // Step 3: Create updated webhook data
  const webhookUpdateBody: IShoppingMallPaymentWebhook.IUpdate = {
    endpoint: typia.random<string & tags.Format<"uri">>(),
    isActive: false,
    eventTypes: ["dispute.opened", "chargeback.initiated"],
  };
  // Step 4: Update the webhook
  const updatedWebhook: IShoppingMallPaymentWebhook =
    await api.functional.shoppingMall.webhooks.update(connection, {
      id: webhookId,
      body: webhookUpdateBody,
    });
  typia.assert(updatedWebhook);
  // Step 5: Validate updated values
  TestValidator.equals(
    "updated endpoint matches",
    updatedWebhook.endpoint,
    webhookUpdateBody.endpoint,
  );
  TestValidator.equals(
    "updated isActive matches",
    updatedWebhook.isActive,
    webhookUpdateBody.isActive,
  );
  TestValidator.equals(
    "updated eventTypes matches",
    updatedWebhook.eventTypes,
    webhookUpdateBody.eventTypes,
  );
}
