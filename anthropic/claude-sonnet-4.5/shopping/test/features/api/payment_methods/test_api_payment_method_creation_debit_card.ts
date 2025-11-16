import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test registering a debit card payment method with proper categorization.
 *
 * This test validates that buyers can successfully register debit card payment
 * methods with the correct payment_type designation. It ensures that debit
 * cards follow the same validation and tokenization requirements as credit
 * cards while being stored with the appropriate payment_type value.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Register a debit card payment method with all required card fields
 * 3. Validate the response contains correct debit card details and payment_type
 */
export async function test_api_payment_method_creation_debit_card(
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

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Register a debit card payment method
  const debitCardData = {
    payment_type: "debit_card",
    provider: "Stripe",
    provider_token: typia.random<string>(),
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

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: debitCardData,
    });
  typia.assert(paymentMethod);

  // Step 3: Validate the debit card payment method
  TestValidator.equals(
    "payment type should be debit_card",
    paymentMethod.payment_type,
    "debit_card",
  );
  TestValidator.equals(
    "provider should match",
    paymentMethod.provider,
    debitCardData.provider,
  );
  TestValidator.equals(
    "card brand should match",
    paymentMethod.card_brand,
    debitCardData.card_brand,
  );
  TestValidator.equals(
    "last four digits should match",
    paymentMethod.last_four_digits,
    debitCardData.last_four_digits,
  );
  TestValidator.equals(
    "expiry month should match",
    paymentMethod.expiry_month,
    debitCardData.expiry_month,
  );
  TestValidator.equals(
    "expiry year should match",
    paymentMethod.expiry_year,
    debitCardData.expiry_year,
  );
  TestValidator.equals(
    "billing name should match",
    paymentMethod.billing_name,
    debitCardData.billing_name,
  );
  TestValidator.equals(
    "is default should be true",
    paymentMethod.is_default,
    true,
  );
}
