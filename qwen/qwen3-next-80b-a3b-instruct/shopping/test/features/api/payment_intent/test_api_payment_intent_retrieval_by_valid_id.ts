import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import type { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";
export async function test_api_payment_intent_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid payment intent with all required properties
  const paymentIntent: IShoppingMallPaymentIntent =
    typia.random<IShoppingMallPaymentIntent>();
  typia.assert(paymentIntent);
  // Extract the paymentIntentId for retrieval
  const paymentIntentId = paymentIntent.id;
  // Call the API to retrieve the payment intent by valid ID
  const retrievedPaymentIntent: IShoppingMallPaymentIntent =
    await api.functional.shoppingMall.payment_intents.at(connection, {
      paymentIntentId,
    });
  // Validate the response contains all expected financial details
  typia.assert(retrievedPaymentIntent);
  // Verify all key financial details match the original
  TestValidator.equals(
    "payment intent ID matches",
    retrievedPaymentIntent.id,
    paymentIntentId,
  );
  TestValidator.equals(
    "amount matches",
    retrievedPaymentIntent.amount,
    paymentIntent.amount,
  );
  TestValidator.equals(
    "currency matches",
    retrievedPaymentIntent.currency,
    paymentIntent.currency,
  );
  TestValidator.equals(
    "status matches",
    retrievedPaymentIntent.status,
    paymentIntent.status,
  );
  TestValidator.equals(
    "payment method ID matches",
    retrievedPaymentIntent.payment_method_id,
    paymentIntent.payment_method_id,
  );
  TestValidator.equals(
    "payment gateway matches",
    retrievedPaymentIntent.payment_gateway,
    paymentIntent.payment_gateway,
  );
  // Verify metadata structure and type
  TestValidator.equals(
    "metadata is a string",
    typeof retrievedPaymentIntent.metadata,
    "string",
  );
  // Verify client metadata is properly set
  TestValidator.equals(
    "client IP is set",
    typeof retrievedPaymentIntent.client_ip,
    "string",
  );
  TestValidator.equals(
    "user agent is set",
    typeof retrievedPaymentIntent.user_agent,
    "string",
  );
  TestValidator.equals(
    "webhook URL is a valid URI",
    typeof retrievedPaymentIntent.webhook_url,
    "string",
  );
  // Verify contract and channel references are UUID format
  TestValidator.equals(
    "contract ID is set",
    typeof retrievedPaymentIntent.contract_id,
    "string",
  );
  TestValidator.equals(
    "channel ID is set",
    typeof retrievedPaymentIntent.channel_id,
    "string",
  );
}
