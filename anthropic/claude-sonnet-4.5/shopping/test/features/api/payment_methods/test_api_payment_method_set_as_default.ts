import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the complete workflow of setting a payment method as the buyer's default
 * payment option.
 *
 * This scenario validates that a buyer can successfully register multiple
 * payment methods and then designate one as their default for streamlined
 * checkout. The test verifies that only one payment method can be marked as
 * default at any time, and that setting a new default automatically clears the
 * default status from any previously default payment method.
 *
 * Workflow steps:
 *
 * 1. Create a new buyer account through authentication
 * 2. Register the first payment method (credit card)
 * 3. Verify the first payment method is set as default automatically
 * 4. Register a second payment method (debit card) without setting it as default
 * 5. Verify the first payment method remains the default
 * 6. Set the second payment method as the new default
 * 7. Verify the second payment method is now marked as default
 * 8. Verify the first payment method's default status has been cleared
 */
export async function test_api_payment_method_set_as_default(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account
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

  // Step 2: Register the first payment method (credit card) with is_default set to true
  const firstPaymentMethodData = {
    payment_type: "credit_card",
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

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: firstPaymentMethodData,
    });
  typia.assert(firstPaymentMethod);

  // Step 3: Verify the first payment method is set as default
  TestValidator.equals(
    "first payment method should be default",
    firstPaymentMethod.is_default,
    true,
  );

  // Step 4: Register a second payment method (debit card) without setting it as default
  const secondPaymentMethodData = {
    payment_type: "debit_card",
    provider: "PayPal",
    provider_token: typia.random<string>(),
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
    billing_postal_code: typia.random<string>(),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: secondPaymentMethodData,
    });
  typia.assert(secondPaymentMethod);

  // Step 5: Verify the second payment method is not set as default
  TestValidator.equals(
    "second payment method should not be default",
    secondPaymentMethod.is_default,
    false,
  );

  // Step 6: Set the second payment method as the new default
  const updatedSecondPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.setDefault(
      connection,
      {
        paymentMethodId: secondPaymentMethod.id,
      },
    );
  typia.assert(updatedSecondPaymentMethod);

  // Step 7: Verify the second payment method is now marked as default
  TestValidator.equals(
    "second payment method should now be default",
    updatedSecondPaymentMethod.is_default,
    true,
  );

  // Step 8: Verify that setting a new default returns the updated payment method with correct properties
  TestValidator.equals(
    "updated payment method ID should match",
    updatedSecondPaymentMethod.id,
    secondPaymentMethod.id,
  );
  TestValidator.equals(
    "payment type should remain unchanged",
    updatedSecondPaymentMethod.payment_type,
    secondPaymentMethod.payment_type,
  );
  TestValidator.equals(
    "provider should remain unchanged",
    updatedSecondPaymentMethod.provider,
    secondPaymentMethod.provider,
  );
}
