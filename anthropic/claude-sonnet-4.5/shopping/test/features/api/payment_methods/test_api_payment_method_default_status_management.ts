import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the default payment method handling when buyers register multiple
 * payment instruments.
 *
 * This test validates the exclusive default payment method behavior, ensuring
 * only one payment method can be marked as default at any time. When a new
 * payment method is set as default, the previous default is automatically
 * updated to non-default status.
 *
 * Workflow:
 *
 * 1. Register and authenticate a buyer account
 * 2. Register first payment method - should automatically become default
 * 3. Register second payment method without is_default flag - should remain
 *    non-default
 * 4. Register third payment method with is_default=true - should become new
 *    default
 * 5. Verify only one payment method has is_default=true at any time
 */
export async function test_api_payment_method_default_status_management(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 2: Register first payment method (should automatically become default)
  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "visa",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia.random<string>(),
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(firstPaymentMethod);

  // Validate first payment method is automatically set as default
  TestValidator.predicate(
    "first payment method should automatically be default",
    firstPaymentMethod.is_default === true,
  );

  // Step 3: Register second payment method without is_default flag (should remain non-default)
  const secondPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "debit_card",
        provider: "PayPal",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "mastercard",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia.random<string>(),
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(secondPaymentMethod);

  // Validate second payment method is not default
  TestValidator.predicate(
    "second payment method should not be default when flag not set",
    secondPaymentMethod.is_default === false,
  );

  // Step 4: Register third payment method with is_default explicitly set to true
  const thirdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Square",
        provider_token: RandomGenerator.alphaNumeric(32),
        card_brand: "amex",
        last_four_digits: RandomGenerator.alphaNumeric(4),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia.random<string>(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(thirdPaymentMethod);

  // Validate third payment method became the new default
  TestValidator.predicate(
    "third payment method should be default when explicitly set",
    thirdPaymentMethod.is_default === true,
  );
}
