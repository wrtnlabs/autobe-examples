import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the security enforcement that ensures buyers can only delete payment
 * methods they own.
 *
 * This test validates ownership verification for payment method deletion by
 * creating two separate buyer accounts and attempting cross-account deletion.
 * The test ensures that buyer B cannot delete a payment method owned by buyer
 * A, confirming proper authorization boundaries and security isolation.
 *
 * Steps:
 *
 * 1. Register buyer A and authenticate
 * 2. Buyer A creates a payment method
 * 3. Register buyer B and authenticate
 * 4. Buyer B attempts to delete buyer A's payment method (should fail)
 * 5. Verify the deletion attempt was rejected with authorization error
 */
export async function test_api_payment_method_deletion_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Register buyer A and authenticate
  const buyerAEmail = typia.random<string & tags.Format<"email">>();
  const buyerA: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyerA);

  // Step 2: Buyer A creates a payment method
  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: typia.random<string>(),
    card_brand: "Visa",
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

  const buyerAPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(buyerAPaymentMethod);

  // Step 3: Register buyer B and authenticate
  const buyerBEmail = typia.random<string & tags.Format<"email">>();
  const buyerB: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyerB);

  // Step 4: Buyer B attempts to delete buyer A's payment method (should fail)
  await TestValidator.error(
    "buyer B cannot delete buyer A's payment method",
    async () => {
      await api.functional.shoppingMall.buyer.paymentMethods.erase(connection, {
        paymentMethodId: buyerAPaymentMethod.id,
      });
    },
  );
}
