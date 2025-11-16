import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test registering payment methods from multiple payment providers.
 *
 * This test validates that the shopping mall platform supports multiple payment
 * processors and can handle provider-specific tokens correctly. It ensures that
 * buyers can register and maintain payment methods from different providers
 * (Stripe, PayPal, Square) simultaneously without conflicts.
 *
 * The test follows this workflow:
 *
 * 1. Register and authenticate as a buyer
 * 2. Register a Stripe credit card payment method
 * 3. Register a PayPal digital wallet payment method
 * 4. Register a Square credit card payment method
 * 5. Validate that each payment method is correctly created with provider-specific
 *    data
 * 6. Verify that all payment methods coexist for the same buyer
 */
export async function test_api_payment_method_multiple_providers(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as buyer
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Register Stripe credit card payment method
  const stripeToken = `stripe_tok_${RandomGenerator.alphaNumeric(24)}`;
  const stripePaymentMethod = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: stripeToken,
    card_brand: "visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const stripeMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: stripePaymentMethod,
    });
  typia.assert(stripeMethod);

  // Validate Stripe payment method
  TestValidator.equals("stripe provider name", stripeMethod.provider, "Stripe");
  TestValidator.equals(
    "stripe payment type",
    stripeMethod.payment_type,
    "credit_card",
  );
  TestValidator.equals(
    "stripe token matches",
    stripeMethod.provider_token,
    stripeToken,
  );

  // Step 3: Register PayPal digital wallet payment method
  const paypalToken = `paypal_ba_${RandomGenerator.alphaNumeric(20)}`;
  const paypalPaymentMethod = {
    payment_type: "paypal",
    provider: "PayPal",
    provider_token: paypalToken,
    billing_name: RandomGenerator.name(),
    billing_postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paypalMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paypalPaymentMethod,
    });
  typia.assert(paypalMethod);

  // Validate PayPal payment method
  TestValidator.equals("paypal provider name", paypalMethod.provider, "PayPal");
  TestValidator.equals(
    "paypal payment type",
    paypalMethod.payment_type,
    "paypal",
  );
  TestValidator.equals(
    "paypal token matches",
    paypalMethod.provider_token,
    paypalToken,
  );

  // Step 4: Register Square credit card payment method
  const squareToken = `square_cnon_${RandomGenerator.alphaNumeric(22)}`;
  const squarePaymentMethod = {
    payment_type: "credit_card",
    provider: "Square",
    provider_token: squareToken,
    card_brand: "mastercard",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const squareMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: squarePaymentMethod,
    });
  typia.assert(squareMethod);

  // Validate Square payment method
  TestValidator.equals("square provider name", squareMethod.provider, "Square");
  TestValidator.equals(
    "square payment type",
    squareMethod.payment_type,
    "credit_card",
  );
  TestValidator.equals(
    "square token matches",
    squareMethod.provider_token,
    squareToken,
  );

  // Step 5: Verify all payment methods belong to the same buyer
  TestValidator.equals(
    "stripe method buyer id",
    stripeMethod.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "paypal method buyer id",
    paypalMethod.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "square method buyer id",
    squareMethod.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 6: Verify different providers have unique payment method IDs
  TestValidator.notEquals(
    "stripe and paypal have different IDs",
    stripeMethod.id,
    paypalMethod.id,
  );
  TestValidator.notEquals(
    "paypal and square have different IDs",
    paypalMethod.id,
    squareMethod.id,
  );
  TestValidator.notEquals(
    "stripe and square have different IDs",
    stripeMethod.id,
    squareMethod.id,
  );
}
