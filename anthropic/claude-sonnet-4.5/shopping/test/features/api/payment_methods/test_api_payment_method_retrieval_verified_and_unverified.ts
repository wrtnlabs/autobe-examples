import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test payment method retrieval with verification status validation.
 *
 * This test validates that the is_verified flag is correctly stored and
 * returned during payment method retrieval operations. The verification status
 * is set automatically by the payment provider during creation and is critical
 * for checkout validation, as only verified payment methods can be used for
 * actual transactions to prevent payment failures during order processing.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Register first payment method with valid provider details
 * 3. Retrieve the first payment method and validate is_verified field exists
 * 4. Register second payment method with different provider
 * 5. Retrieve the second payment method and validate is_verified field
 * 6. Confirm that verification status is a boolean and persists correctly
 */
export async function test_api_payment_method_retrieval_verified_and_unverified(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, { body: buyerData });
  typia.assert(buyer);

  // Step 2: Create first payment method
  const firstPaymentData = {
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
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstPayment: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: firstPaymentData,
    });
  typia.assert(firstPayment);

  // Step 3: Retrieve first payment method and validate is_verified field
  const retrievedFirst: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: firstPayment.id,
    });
  typia.assert(retrievedFirst);

  TestValidator.equals(
    "first payment method ID matches",
    retrievedFirst.id,
    firstPayment.id,
  );

  TestValidator.predicate(
    "first payment method has is_verified as boolean",
    typeof retrievedFirst.is_verified === "boolean",
  );

  // Step 4: Create second payment method with different provider
  const secondPaymentData = {
    payment_type: "debit_card",
    provider: "PayPal",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "mastercard",
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
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondPayment: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: secondPaymentData,
    });
  typia.assert(secondPayment);

  // Step 5: Retrieve second payment method and validate is_verified field
  const retrievedSecond: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: secondPayment.id,
    });
  typia.assert(retrievedSecond);

  TestValidator.equals(
    "second payment method ID matches",
    retrievedSecond.id,
    secondPayment.id,
  );

  TestValidator.predicate(
    "second payment method has is_verified as boolean",
    typeof retrievedSecond.is_verified === "boolean",
  );

  // Step 6: Validate that verification status persists correctly
  TestValidator.equals(
    "first payment verification status persists",
    retrievedFirst.is_verified,
    firstPayment.is_verified,
  );

  TestValidator.equals(
    "second payment verification status persists",
    retrievedSecond.is_verified,
    secondPayment.is_verified,
  );
}
