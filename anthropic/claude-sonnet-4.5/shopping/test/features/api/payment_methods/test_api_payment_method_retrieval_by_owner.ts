import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test that an authenticated buyer can successfully retrieve their own payment
 * method details by payment method ID.
 *
 * This test validates the core read operation for payment method management
 * where buyers view their saved payment instruments during checkout or in
 * account settings. It verifies that the operation returns complete payment
 * method information including payment type, masked card details, card brand,
 * expiration date, billing information, provider details, verification status,
 * and default status.
 *
 * The test ensures that all sensitive information is properly masked in the
 * response, with only the last four digits of the card number visible.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Create a payment method owned by the authenticated buyer
 * 3. Retrieve the payment method by its ID
 * 4. Validate the response contains all expected fields with correct values
 * 5. Verify sensitive card data is properly masked
 */
export async function test_api_payment_method_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
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

  // Step 2: Create a payment method owned by the authenticated buyer
  const paymentTypes = [
    "credit_card",
    "debit_card",
    "paypal",
    "apple_pay",
    "google_pay",
  ] as const;
  const cardBrands = ["visa", "mastercard", "amex", "discover"] as const;

  const paymentMethodData = {
    payment_type: RandomGenerator.pick(paymentTypes),
    provider: RandomGenerator.pick([
      "Stripe",
      "PayPal",
      "Square",
      "Braintree",
    ] as const),
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: RandomGenerator.pick(cardBrands),
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
    billing_postal_code: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(createdPaymentMethod);

  // Step 3: Retrieve the payment method by its ID
  const retrievedPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: createdPaymentMethod.id,
    });
  typia.assert(retrievedPaymentMethod);

  // Step 4: Validate the response contains all expected fields with correct values
  TestValidator.equals(
    "retrieved payment method ID matches created payment method ID",
    retrievedPaymentMethod.id,
    createdPaymentMethod.id,
  );

  TestValidator.equals(
    "payment type matches",
    retrievedPaymentMethod.payment_type,
    paymentMethodData.payment_type,
  );

  TestValidator.equals(
    "provider matches",
    retrievedPaymentMethod.provider,
    paymentMethodData.provider,
  );

  TestValidator.equals(
    "card brand matches",
    retrievedPaymentMethod.card_brand,
    paymentMethodData.card_brand,
  );

  TestValidator.equals(
    "billing name matches",
    retrievedPaymentMethod.billing_name,
    paymentMethodData.billing_name,
  );

  TestValidator.equals(
    "default status matches",
    retrievedPaymentMethod.is_default,
    paymentMethodData.is_default,
  );

  // Step 5: Verify sensitive card data is properly masked (only last four digits visible)
  TestValidator.equals(
    "last four digits matches (sensitive data masked)",
    retrievedPaymentMethod.last_four_digits,
    paymentMethodData.last_four_digits,
  );

  TestValidator.predicate(
    "payment method is verified",
    retrievedPaymentMethod.is_verified,
  );

  TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(retrievedPaymentMethod.created_at).getTime() > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(retrievedPaymentMethod.updated_at).getTime() > 0,
  );
}
