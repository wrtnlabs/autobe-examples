import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test retrieving a payment method that is marked as the buyer's default
 * payment method.
 *
 * This test validates that the is_default flag is correctly returned when
 * retrieving a payment method that has been designated as the default. The test
 * creates a payment method with is_default set to true during creation, then
 * retrieves it to verify the default status is accurately reflected in the
 * response.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Create a payment method with is_default set to true
 * 3. Retrieve the payment method by ID
 * 4. Validate that is_default is true in the retrieved payment method
 */
export async function test_api_payment_method_retrieval_with_default_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Create a payment method with is_default set to true
  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: typia.random<
      string & tags.MinLength<4> & tags.MaxLength<4>
    >(),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: typia.random<string>(),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(createdPaymentMethod);

  // Step 3: Retrieve the payment method by ID
  const retrievedPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: createdPaymentMethod.id,
    });
  typia.assert(retrievedPaymentMethod);

  // Step 4: Validate the retrieved payment method has is_default set to true
  TestValidator.equals(
    "retrieved payment method ID matches created ID",
    retrievedPaymentMethod.id,
    createdPaymentMethod.id,
  );

  TestValidator.equals(
    "is_default flag is true in retrieved payment method",
    retrievedPaymentMethod.is_default,
    true,
  );
}
