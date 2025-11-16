import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test retrieving payment methods of different payment types (credit card,
 * debit card, digital wallet).
 *
 * This test validates that the payment method retrieval operation correctly
 * handles various payment instrument categories and returns appropriate data
 * structures for each type. For card-based methods, it verifies that
 * card_brand, last_four_digits, expiry_month, and expiry_year are present. For
 * non-card methods like PayPal, it verifies that card-specific fields are
 * appropriately null.
 *
 * Test steps:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Create a credit card payment method with card-specific fields
 * 3. Create a debit card payment method with card-specific fields
 * 4. Create a PayPal digital wallet payment method without card fields
 * 5. Retrieve each payment method and validate type-specific fields
 * 6. Verify card methods have populated card fields
 * 7. Verify non-card methods have null card fields
 */
export async function test_api_payment_method_retrieval_multiple_payment_types(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Create credit card payment method
  const creditCardData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "Visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
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

  const creditCard: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: creditCardData,
    });
  typia.assert(creditCard);

  // Step 3: Create debit card payment method
  const debitCardData = {
    payment_type: "debit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "Mastercard",
    last_four_digits: RandomGenerator.alphaNumeric(4),
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

  const debitCard: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: debitCardData,
    });
  typia.assert(debitCard);

  // Step 4: Create PayPal digital wallet payment method
  const paypalData = {
    payment_type: "paypal",
    provider: "PayPal",
    provider_token: RandomGenerator.alphaNumeric(32),
    billing_name: RandomGenerator.name(),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paypal: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paypalData,
    });
  typia.assert(paypal);

  // Step 5: Retrieve credit card payment method and validate card-specific fields
  const retrievedCreditCard: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: creditCard.id,
    });
  typia.assert(retrievedCreditCard);

  TestValidator.equals(
    "credit card ID matches",
    retrievedCreditCard.id,
    creditCard.id,
  );
  TestValidator.equals(
    "credit card type",
    retrievedCreditCard.payment_type,
    "credit_card",
  );
  TestValidator.predicate(
    "credit card has card_brand",
    retrievedCreditCard.card_brand !== null &&
      retrievedCreditCard.card_brand !== undefined,
  );
  TestValidator.predicate(
    "credit card has last_four_digits",
    retrievedCreditCard.last_four_digits !== null &&
      retrievedCreditCard.last_four_digits !== undefined,
  );
  TestValidator.predicate(
    "credit card has expiry_month",
    retrievedCreditCard.expiry_month !== null &&
      retrievedCreditCard.expiry_month !== undefined,
  );
  TestValidator.predicate(
    "credit card has expiry_year",
    retrievedCreditCard.expiry_year !== null &&
      retrievedCreditCard.expiry_year !== undefined,
  );

  // Step 6: Retrieve debit card payment method and validate card-specific fields
  const retrievedDebitCard: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: debitCard.id,
    });
  typia.assert(retrievedDebitCard);

  TestValidator.equals(
    "debit card ID matches",
    retrievedDebitCard.id,
    debitCard.id,
  );
  TestValidator.equals(
    "debit card type",
    retrievedDebitCard.payment_type,
    "debit_card",
  );
  TestValidator.predicate(
    "debit card has card_brand",
    retrievedDebitCard.card_brand !== null &&
      retrievedDebitCard.card_brand !== undefined,
  );
  TestValidator.predicate(
    "debit card has last_four_digits",
    retrievedDebitCard.last_four_digits !== null &&
      retrievedDebitCard.last_four_digits !== undefined,
  );
  TestValidator.predicate(
    "debit card has expiry_month",
    retrievedDebitCard.expiry_month !== null &&
      retrievedDebitCard.expiry_month !== undefined,
  );
  TestValidator.predicate(
    "debit card has expiry_year",
    retrievedDebitCard.expiry_year !== null &&
      retrievedDebitCard.expiry_year !== undefined,
  );

  // Step 7: Retrieve PayPal payment method and validate card-specific fields are null
  const retrievedPaypal: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.at(connection, {
      paymentMethodId: paypal.id,
    });
  typia.assert(retrievedPaypal);

  TestValidator.equals("paypal ID matches", retrievedPaypal.id, paypal.id);
  TestValidator.equals("paypal type", retrievedPaypal.payment_type, "paypal");
  TestValidator.predicate(
    "paypal card_brand is null or undefined",
    retrievedPaypal.card_brand === null ||
      retrievedPaypal.card_brand === undefined,
  );
  TestValidator.predicate(
    "paypal last_four_digits is null or undefined",
    retrievedPaypal.last_four_digits === null ||
      retrievedPaypal.last_four_digits === undefined,
  );
  TestValidator.predicate(
    "paypal expiry_month is null or undefined",
    retrievedPaypal.expiry_month === null ||
      retrievedPaypal.expiry_month === undefined,
  );
  TestValidator.predicate(
    "paypal expiry_year is null or undefined",
    retrievedPaypal.expiry_year === null ||
      retrievedPaypal.expiry_year === undefined,
  );
}
