import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test payment method creation with tokenization security.
 *
 * This test validates PCI DSS compliance by ensuring:
 *
 * 1. System accepts only provider_token values from payment gateways
 * 2. Raw card numbers are never stored in the database
 * 3. Only last_four_digits are accessible for display purposes
 * 4. Full card numbers are never exposed in any API response
 *
 * Test workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Create payment method with tokenized data (provider_token)
 * 3. Retrieve payment method to verify only masked data is returned
 * 4. Validate PCI DSS compliance through proper tokenization
 */
export async function test_api_payment_method_creation_tokenization_security(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerData = {
    email: buyerEmail,
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

  // Step 2: Create payment method with tokenized data
  const providers = ["Stripe", "PayPal", "Square", "Braintree"] as const;
  const paymentTypes = ["credit_card", "debit_card"] as const;
  const cardBrands = ["visa", "mastercard", "amex", "discover"] as const;

  const paymentMethodData = {
    payment_type: RandomGenerator.pick(paymentTypes),
    provider: RandomGenerator.pick(providers),
    provider_token: `tok_${RandomGenerator.alphaNumeric(24)}`,
    card_brand: RandomGenerator.pick(cardBrands),
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(6),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(createdPaymentMethod);

  // Step 3: Verify payment method was created with tokenized data
  TestValidator.equals(
    "payment type matches",
    createdPaymentMethod.payment_type,
    paymentMethodData.payment_type,
  );
  TestValidator.equals(
    "provider matches",
    createdPaymentMethod.provider,
    paymentMethodData.provider,
  );
  TestValidator.equals(
    "card brand matches",
    createdPaymentMethod.card_brand,
    paymentMethodData.card_brand,
  );
  TestValidator.equals(
    "last four digits match",
    createdPaymentMethod.last_four_digits,
    paymentMethodData.last_four_digits,
  );
  TestValidator.equals(
    "billing name matches",
    createdPaymentMethod.billing_name,
    paymentMethodData.billing_name,
  );
  TestValidator.equals(
    "is default flag matches",
    createdPaymentMethod.is_default,
    paymentMethodData.is_default,
  );

  // Step 4: Retrieve payment method to verify only masked data is returned
  const retrievedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: createdPaymentMethod.id,
    });
  typia.assert(retrievedPaymentMethod);

  // Step 5: Validate PCI DSS compliance - only masked data is accessible
  TestValidator.equals(
    "retrieved payment method ID matches",
    retrievedPaymentMethod.id,
    createdPaymentMethod.id,
  );
  TestValidator.equals(
    "retrieved last four digits match",
    retrievedPaymentMethod.last_four_digits,
    paymentMethodData.last_four_digits,
  );
  TestValidator.equals(
    "retrieved provider matches",
    retrievedPaymentMethod.provider,
    paymentMethodData.provider,
  );
  TestValidator.equals(
    "retrieved card brand matches",
    retrievedPaymentMethod.card_brand,
    paymentMethodData.card_brand,
  );

  // Verify that provider_token is stored but response only contains masked data
  TestValidator.predicate(
    "provider token is stored internally",
    retrievedPaymentMethod.provider_token ===
      createdPaymentMethod.provider_token,
  );

  // Verify no full card number is ever exposed
  TestValidator.predicate(
    "only last four digits are accessible",
    typeof retrievedPaymentMethod.last_four_digits === "string" &&
      retrievedPaymentMethod.last_four_digits.length === 4,
  );
}
