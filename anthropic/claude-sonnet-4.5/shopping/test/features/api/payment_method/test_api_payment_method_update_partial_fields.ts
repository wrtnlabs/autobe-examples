import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test partial update capability of payment methods to ensure field-level
 * granularity.
 *
 * This test validates that buyers can selectively modify specific payment
 * method fields without affecting other properties. It creates a buyer account,
 * registers a payment method with complete billing information, performs a
 * partial update on only the billing_postal_code field, and verifies that only
 * the targeted field changes while all other fields remain unchanged.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a buyer account
 * 2. Register a payment method with complete billing details
 * 3. Update only billing_postal_code field
 * 4. Verify billing_postal_code reflects new value
 * 5. Verify billing_name and all other fields remain unchanged
 */
export async function test_api_payment_method_update_partial_fields(
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
    await api.functional.auth.buyer.join(connection, {
      body: buyerData,
    });
  typia.assert(buyer);

  // Step 2: Register payment method with complete billing information
  const originalBillingName = RandomGenerator.name();
  const originalPostalCode = RandomGenerator.alphaNumeric(5);

  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: typia.random<string>(),
    card_brand: "visa",
    last_four_digits: RandomGenerator.alphaNumeric(4),
    expiry_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    expiry_year: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<2024>
    >(),
    billing_name: originalBillingName,
    billing_postal_code: originalPostalCode,
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(createdPaymentMethod);

  // Step 3: Perform partial update - modify only billing_postal_code
  const newPostalCode = RandomGenerator.alphaNumeric(5);

  const updateData = {
    billing_postal_code: newPostalCode,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updatedPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.update(connection, {
      paymentMethodId: createdPaymentMethod.id,
      body: updateData,
    });
  typia.assert(updatedPaymentMethod);

  // Step 4: Verify billing_postal_code reflects the new value
  TestValidator.equals(
    "billing_postal_code should be updated",
    updatedPaymentMethod.billing_postal_code,
    newPostalCode,
  );

  // Step 5: Verify billing_name remains unchanged
  TestValidator.equals(
    "billing_name should remain unchanged",
    updatedPaymentMethod.billing_name,
    originalBillingName,
  );

  // Step 6: Verify all other fields remain unchanged
  TestValidator.equals(
    "payment_type should remain unchanged",
    updatedPaymentMethod.payment_type,
    createdPaymentMethod.payment_type,
  );

  TestValidator.equals(
    "provider should remain unchanged",
    updatedPaymentMethod.provider,
    createdPaymentMethod.provider,
  );

  TestValidator.equals(
    "provider_token should remain unchanged",
    updatedPaymentMethod.provider_token,
    createdPaymentMethod.provider_token,
  );

  TestValidator.equals(
    "card_brand should remain unchanged",
    updatedPaymentMethod.card_brand,
    createdPaymentMethod.card_brand,
  );

  TestValidator.equals(
    "last_four_digits should remain unchanged",
    updatedPaymentMethod.last_four_digits,
    createdPaymentMethod.last_four_digits,
  );

  TestValidator.equals(
    "expiry_month should remain unchanged",
    updatedPaymentMethod.expiry_month,
    createdPaymentMethod.expiry_month,
  );

  TestValidator.equals(
    "expiry_year should remain unchanged",
    updatedPaymentMethod.expiry_year,
    createdPaymentMethod.expiry_year,
  );

  TestValidator.equals(
    "is_default should remain unchanged",
    updatedPaymentMethod.is_default,
    createdPaymentMethod.is_default,
  );

  TestValidator.equals(
    "ID should remain the same",
    updatedPaymentMethod.id,
    createdPaymentMethod.id,
  );
}
