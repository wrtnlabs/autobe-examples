import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentNotification";
export async function test_api_payment_notification_processing(
  connection: api.IConnection,
): Promise<void> {
  // Since IRequest only contains page and limit properties, we must use those
  // Create a valid request with required page and limit properties
  const requestBody = {
    page: 1,
    limit: 25,
  } satisfies IShoppingMallPaymentNotification.IRequest;
  // Execute the payment notification processing endpoint with proper parameters
  const response =
    await api.functional.shoppingMall.payment_notifications.receive(
      connection,
      { body: requestBody },
    );
  typia.assert(response);
  // Validate response structure - checking for properties that exist in IResponse
  TestValidator.equals(
    "response status should be received",
    response.status,
    "received",
  );
  // Validate paymentId has correct UUID format using typia.assert
  // This validates the response type as IResponse which includes paymentId
  const paymentId = typia.assert<string & tags.Format<"uuid">>(
    response.paymentId,
  );
  TestValidator.equals(
    "response message should be confirmation",
    response.message,
    "Payment notification received and queued for processing",
  );
  // Re-send the same request (idempotency test)
  const secondResponse =
    await api.functional.shoppingMall.payment_notifications.receive(
      connection,
      { body: requestBody },
    );
  typia.assert(secondResponse);
  // Validate second response is identical to first
  TestValidator.equals(
    "second response matches first",
    response,
    secondResponse,
  );
}
