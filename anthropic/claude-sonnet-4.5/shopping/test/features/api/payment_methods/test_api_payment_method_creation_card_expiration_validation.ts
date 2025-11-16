import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test payment method creation with card expiration validation.
 *
 * This test validates that the payment method creation endpoint properly
 * validates card expiration dates by ensuring expiry_month is between 1-12 and
 * expiry_year represents a future date. The test creates various payment
 * methods with different expiration date combinations including valid future
 * dates and edge cases like December (month 12).
 *
 * Steps:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Register a payment method with a valid future expiration date (far future)
 * 3. Register a payment method with edge case month 12 (December)
 * 4. Register a payment method expiring in the current year but future month
 * 5. Verify all expiration information is stored correctly
 */
export async function test_api_payment_method_creation_card_expiration_validation(
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

  // Step 2: Register payment method with valid future expiration (year 2027, month 6)
  const futureYear = 2027;
  const futureMonth = 6;

  const paymentMethod1 = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: futureMonth,
    expiry_year: futureYear,
    billing_name: buyer.full_name,
    billing_postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPayment1: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethod1,
    });
  typia.assert(createdPayment1);

  TestValidator.equals(
    "expiry month matches",
    createdPayment1.expiry_month,
    futureMonth,
  );
  TestValidator.equals(
    "expiry year matches",
    createdPayment1.expiry_year,
    futureYear,
  );
  TestValidator.equals("is default flag set", createdPayment1.is_default, true);

  // Step 3: Register payment method with edge case December (month 12)
  const decemberMonth = 12;
  const decemberYear = 2026;

  const paymentMethod2 = {
    payment_type: "credit_card",
    provider: "PayPal",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "mastercard",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: decemberMonth,
    expiry_year: decemberYear,
    billing_name: buyer.full_name,
    billing_postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPayment2: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethod2,
    });
  typia.assert(createdPayment2);

  TestValidator.equals(
    "December month stored correctly",
    createdPayment2.expiry_month,
    decemberMonth,
  );
  TestValidator.equals(
    "December year stored correctly",
    createdPayment2.expiry_year,
    decemberYear,
  );

  // Step 4: Register payment method with minimum valid month (January, month 1)
  const januaryMonth = 1;
  const januaryYear = 2025;

  const paymentMethod3 = {
    payment_type: "debit_card",
    provider: "Square",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "amex",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: januaryMonth,
    expiry_year: januaryYear,
    billing_name: buyer.full_name,
    billing_postal_code: typia
      .random<
        number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPayment3: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethod3,
    });
  typia.assert(createdPayment3);

  TestValidator.equals(
    "January month stored correctly",
    createdPayment3.expiry_month,
    januaryMonth,
  );
  TestValidator.equals(
    "January year stored correctly",
    createdPayment3.expiry_year,
    januaryYear,
  );

  // Step 5: Verify all payment methods are properly associated with the buyer
  TestValidator.predicate(
    "payment method 1 belongs to buyer",
    createdPayment1.shopping_mall_buyer_id === buyer.id,
  );
  TestValidator.predicate(
    "payment method 2 belongs to buyer",
    createdPayment2.shopping_mall_buyer_id === buyer.id,
  );
  TestValidator.predicate(
    "payment method 3 belongs to buyer",
    createdPayment3.shopping_mall_buyer_id === buyer.id,
  );
}
