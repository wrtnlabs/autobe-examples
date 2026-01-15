import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWebhookMetadata";
export async function test_api_payment_webhook_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid payment webhook payload with realistic test data
  const webhookPayload: IShoppingMallPaymentWebhook = {
    id: typia.random<string & tags.Format<"uuid">>(),
    endpoint: "https://api.merchant.com/webhook/payment-v2",
    isActive: true,
    eventTypes: ["payment.success", "refund.processed", "dispute.opened"],
    createdAt: new Date().toISOString(),
    lastDeliveryAttempt: new Date().toISOString(),
    deliveryFailureCount: 0,
    secretKey: "secret_key_1234567890abcdef",
    metadata: JSON.stringify({
      integrationId: "merchant-sys-v4",
      env: "production",
      note: "Points to Stripe webhook on port 8443",
    }) as IShoppingMallWebhookMetadata,
  };
  // Call the payment webhook endpoint with the generated payload
  const response: IShoppingMallPaymentWebhook =
    await api.functional.shoppingMall.payment_webhooks.post(connection, {
      body: webhookPayload,
    });
  // Validate the response matches the input payload exactly
  typia.assert(response);
  TestValidator.equals(
    "webhook response matches input",
    response,
    webhookPayload,
  );
}
