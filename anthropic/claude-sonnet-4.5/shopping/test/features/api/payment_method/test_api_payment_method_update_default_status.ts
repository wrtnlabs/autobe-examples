import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the workflow of changing a payment method's default status and verify
 * the system correctly manages default payment method exclusivity.
 *
 * This test validates the critical business rule that only one payment method
 * per buyer can be marked as default at any time.
 *
 * Test workflow:
 *
 * 1. Create a buyer account and obtain authentication
 * 2. Register first payment method with is_default: true (initial default)
 * 3. Register second payment method with is_default: false (non-default)
 * 4. Update the second payment method to is_default: true
 * 5. Verify the updated payment method has is_default: true
 * 6. Confirm system maintains exclusive default status
 */
export async function test_api_payment_method_update_default_status(
  connection: api.IConnection,
) {
  // Step 1: Create a buyer account and obtain authentication
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

  // Step 2: Register first payment method with is_default: true (initial default)
  const firstPaymentMethodData = {
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
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: firstPaymentMethodData,
    });
  typia.assert(firstPaymentMethod);
  TestValidator.equals(
    "first payment method is default",
    firstPaymentMethod.is_default,
    true,
  );

  // Step 3: Register second payment method with is_default: false (non-default)
  const secondPaymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
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
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: secondPaymentMethodData,
    });
  typia.assert(secondPaymentMethod);
  TestValidator.equals(
    "second payment method is not default initially",
    secondPaymentMethod.is_default,
    false,
  );

  // Step 4: Update the second payment method to is_default: true
  const updateData = {
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updatedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.update(connection, {
      paymentMethodId: secondPaymentMethod.id,
      body: updateData,
    });
  typia.assert(updatedPaymentMethod);

  // Step 5: Verify the updated payment method has is_default: true
  TestValidator.equals(
    "updated payment method is now default",
    updatedPaymentMethod.is_default,
    true,
  );
  TestValidator.equals(
    "updated payment method ID matches",
    updatedPaymentMethod.id,
    secondPaymentMethod.id,
  );
}
