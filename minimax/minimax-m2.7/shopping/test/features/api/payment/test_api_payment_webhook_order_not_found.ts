import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPaymentWebhook";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test webhook error handling when order reference does not exist in system.
 *
 * Validates that the webhook endpoint properly handles requests with
 * non-existent order references by returning 404 Not Found.
 */
export async function test_api_payment_webhook_order_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent order reference that will not match any order
  const nonExistentOrderReference = `NON_EXISTENT_${RandomGenerator.alphaNumeric(12)}`;
  // Test webhook with non-existent order reference expecting 404 error
  await TestValidator.httpError(
    "webhook returns 404 for non-existent order",
    404,
    async () =>
      await api.functional.ecommerceMall.payments.webhook.receive(connection, {
        body: {
          transactionId: typia.random<string & tags.Format<"uuid">>(),
          orderReference: nonExistentOrderReference,
          status: "success" as const,
          amount: typia.random<number & tags.Type<"float"> & tags.Minimum<0>>(),
          currency: "USD",
          timestamp: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies import("src/api/structures/IEcommerceMallPaymentWebhook").IEcommerceMallPaymentWebhook.IRequest,
      }),
  );
}
