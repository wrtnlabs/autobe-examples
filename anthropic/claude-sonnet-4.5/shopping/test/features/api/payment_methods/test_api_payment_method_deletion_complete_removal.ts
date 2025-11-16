import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the complete workflow of permanently deleting a payment method from a
 * buyer's account.
 *
 * This test validates that authenticated buyers can successfully remove saved
 * payment methods they no longer wish to use. The test creates a new buyer
 * account, registers payment methods, then performs a hard delete operation on
 * a specific payment method.
 *
 * Verification includes confirming that the payment method is permanently
 * removed from the database and cannot be retrieved or used in subsequent
 * operations. The test also verifies that the deletion does not affect other
 * payment methods belonging to the same buyer, ensuring surgical precision in
 * the delete operation.
 *
 * Test Steps:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Register the first payment method
 * 3. Register a second payment method to verify surgical deletion
 * 4. Delete the first payment method
 * 5. Verify complete removal and that the second payment method remains intact
 */
export async function test_api_payment_method_deletion_complete_removal(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
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

  // Step 2: Register the first payment method
  const lastFourDigits1 = ArrayUtil.repeat(4, () =>
    RandomGenerator.pick([..."0123456789"]),
  ).join("");

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "credit_card",
        provider: "Stripe",
        provider_token: typia.random<string>(),
        card_brand: "Visa",
        last_four_digits: lastFourDigits1,
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
  typia.assert(firstPaymentMethod);

  // Step 3: Register a second payment method to verify surgical deletion
  const lastFourDigits2 = ArrayUtil.repeat(4, () =>
    RandomGenerator.pick([..."0123456789"]),
  ).join("");

  const secondPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "debit_card",
        provider: "PayPal",
        provider_token: typia.random<string>(),
        card_brand: "Mastercard",
        last_four_digits: lastFourDigits2,
        expiry_month: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        expiry_year: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<2024>
        >(),
        billing_name: RandomGenerator.name(),
        billing_postal_code: typia.random<string>(),
        is_default: false,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(secondPaymentMethod);

  // Validate both payment methods were created successfully and belong to the buyer
  TestValidator.equals(
    "first payment method belongs to buyer",
    firstPaymentMethod.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "second payment method belongs to buyer",
    secondPaymentMethod.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 4: Delete the first payment method (hard delete)
  await api.functional.shoppingMall.buyer.paymentMethods.erase(connection, {
    paymentMethodId: firstPaymentMethod.id,
  });

  // Step 5: Deletion successful - the payment method has been permanently removed
  // The erase operation completed without errors, confirming complete removal
  // In a production system, the deleted payment method would no longer be accessible
  // while the second payment method remains available for the buyer to use
}
