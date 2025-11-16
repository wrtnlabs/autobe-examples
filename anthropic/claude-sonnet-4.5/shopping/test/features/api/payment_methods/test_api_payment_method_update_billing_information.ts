import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the complete workflow of updating a buyer's saved payment method with
 * new billing information.
 *
 * This test validates that authenticated buyers can successfully modify billing
 * details such as billing_name and billing_postal_code for their existing
 * payment methods. The test creates a new buyer account, registers a payment
 * method with initial billing information, then updates that payment method
 * with changed billing details.
 *
 * Verification includes confirming that the updated fields reflect the new
 * values while immutable fields like provider_token and card_brand remain
 * unchanged. The test also validates that the payment method continues to
 * function correctly after the update and remains associated with the correct
 * buyer account.
 *
 * Steps:
 *
 * 1. Create a new buyer account and obtain authentication tokens
 * 2. Register an initial payment method with original billing information
 * 3. Update the payment method with new billing details
 * 4. Validate updated fields reflect new values
 * 5. Verify immutable fields remain unchanged
 * 6. Confirm payment method still associated with correct buyer
 */
export async function test_api_payment_method_update_billing_information(
  connection: api.IConnection,
) {
  // Step 1: Create a new buyer account and obtain authentication tokens
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();

  const buyer = await api.functional.auth.buyer.join(connection, {
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

  // Step 2: Register an initial payment method with original billing information
  const originalBillingName = RandomGenerator.name();
  const originalPostalCode = RandomGenerator.alphaNumeric(5);

  const paymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: typia.random<string & tags.Format<"uuid">>(),
        card_brand: "visa",
        last_four_digits: ArrayUtil.repeat(4, () =>
          RandomGenerator.pick([..."0123456789"]),
        ).join(""),
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: originalBillingName,
        billing_postal_code: originalPostalCode,
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod);

  // Store original immutable values for later verification
  const originalProviderToken = paymentMethod.provider_token;
  const originalCardBrand = paymentMethod.card_brand;
  const originalLastFourDigits = paymentMethod.last_four_digits;
  const originalPaymentMethodId = paymentMethod.id;

  // Step 3: Update the payment method with new billing details
  const updatedBillingName = RandomGenerator.name();
  const updatedPostalCode = RandomGenerator.alphaNumeric(5);

  const updatedPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.update(connection, {
      paymentMethodId: paymentMethod.id,
      body: {
        billing_name: updatedBillingName,
        billing_postal_code: updatedPostalCode,
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.IUpdate,
    });
  typia.assert(updatedPaymentMethod);

  // Step 4: Validate updated fields reflect new values
  TestValidator.equals(
    "billing name should be updated",
    updatedPaymentMethod.billing_name,
    updatedBillingName,
  );

  TestValidator.equals(
    "billing postal code should be updated",
    updatedPaymentMethod.billing_postal_code,
    updatedPostalCode,
  );

  TestValidator.equals(
    "is_default should remain true",
    updatedPaymentMethod.is_default,
    true,
  );

  // Step 5: Verify immutable fields remain unchanged
  TestValidator.equals(
    "payment method ID should remain unchanged",
    updatedPaymentMethod.id,
    originalPaymentMethodId,
  );

  TestValidator.equals(
    "provider token should remain unchanged",
    updatedPaymentMethod.provider_token,
    originalProviderToken,
  );

  TestValidator.equals(
    "card brand should remain unchanged",
    updatedPaymentMethod.card_brand,
    originalCardBrand,
  );

  TestValidator.equals(
    "last four digits should remain unchanged",
    updatedPaymentMethod.last_four_digits,
    originalLastFourDigits,
  );

  // Step 6: Confirm payment method still associated with correct buyer
  TestValidator.equals(
    "payment method should still belong to same buyer",
    updatedPaymentMethod.shopping_mall_buyer_id,
    buyer.id,
  );
}
