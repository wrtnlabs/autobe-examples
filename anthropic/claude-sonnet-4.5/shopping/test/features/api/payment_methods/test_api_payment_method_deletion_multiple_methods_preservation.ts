import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test deletion of one payment method while preserving others.
 *
 * This test validates that deleting one payment method from a buyer's account
 * does not affect other payment methods. It creates a buyer with three payment
 * methods, deletes one, and verifies the deletion succeeded by attempting to
 * delete it again (which should fail).
 *
 * Steps:
 *
 * 1. Create a buyer account and authenticate
 * 2. Register three distinct payment methods with different details
 * 3. Delete the second payment method
 * 4. Verify deletion succeeded by attempting to delete the same method again
 *    (should fail)
 * 5. Verify the first and third payment methods can still be deleted (proving they
 *    exist)
 */
export async function test_api_payment_method_deletion_multiple_methods_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account and authenticate
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Register three distinct payment methods
  const paymentMethod1Data = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "Visa",
    last_four_digits: "1234",
    expiry_month: 12 satisfies number as number,
    expiry_year: 2025 satisfies number as number,
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod1 =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethod1Data,
    });
  typia.assert(paymentMethod1);

  const paymentMethod2Data = {
    payment_type: "debit_card",
    provider: "PayPal",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "Mastercard",
    last_four_digits: "5678",
    expiry_month: 6 satisfies number as number,
    expiry_year: 2026 satisfies number as number,
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod2 =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethod2Data,
    });
  typia.assert(paymentMethod2);

  const paymentMethod3Data = {
    payment_type: "credit_card",
    provider: "Square",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "American Express",
    last_four_digits: "9012",
    expiry_month: 3 satisfies number as number,
    expiry_year: 2027 satisfies number as number,
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: false,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod3 =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethod3Data,
    });
  typia.assert(paymentMethod3);

  // Step 3: Delete the second payment method
  await api.functional.shoppingMall.buyer.paymentMethods.erase(connection, {
    paymentMethodId: paymentMethod2.id,
  });

  // Step 4: Verify deletion succeeded by attempting to delete the same method again
  // This should fail because the payment method no longer exists
  await TestValidator.error(
    "deleting already deleted payment method should fail",
    async () => {
      await api.functional.shoppingMall.buyer.paymentMethods.erase(connection, {
        paymentMethodId: paymentMethod2.id,
      });
    },
  );

  // Step 5: Verify the other payment methods still exist by successfully deleting them
  // If these deletions succeed, it proves the payment methods were preserved
  await api.functional.shoppingMall.buyer.paymentMethods.erase(connection, {
    paymentMethodId: paymentMethod1.id,
  });

  await api.functional.shoppingMall.buyer.paymentMethods.erase(connection, {
    paymentMethodId: paymentMethod3.id,
  });
}
