import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test that buyers can register multiple payment methods to their account.
 *
 * This test validates the business requirement that buyers can save multiple
 * cards and payment instruments for convenience and choice during the purchase
 * process.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Register first payment method (Visa credit card via Stripe) as default
 * 3. Register second payment method (Mastercard debit card via Square)
 * 4. Register third payment method (PayPal digital wallet)
 * 5. Validate each payment method has unique ID and correct properties
 * 6. Verify only one payment method is marked as default
 * 7. Confirm all payment methods belong to the same buyer
 */
export async function test_api_payment_method_creation_multiple_methods(
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

  // Step 2: Create first payment method (Visa credit card via Stripe) as default
  const paymentMethod1 =
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
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: true,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod1);

  // Step 3: Create second payment method (Mastercard debit card via Square)
  const paymentMethod2 =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "debit_card",
        provider: "Square",
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
        billing_postal_code: typia
          .random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<10000> &
              tags.Maximum<99999>
          >()
          .toString(),
        is_default: false,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod2);

  // Step 4: Create third payment method (PayPal digital wallet)
  const paymentMethod3 =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: {
        payment_type: "paypal",
        provider: "PayPal",
        provider_token: RandomGenerator.alphaNumeric(32),
        billing_name: RandomGenerator.name(),
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod3);

  // Step 5: Validate all payment methods have unique IDs
  const allIds = [paymentMethod1.id, paymentMethod2.id, paymentMethod3.id];
  TestValidator.predicate(
    "all payment method IDs are unique",
    allIds.length === new Set(allIds).size,
  );

  // Step 6: Verify first payment method properties
  TestValidator.equals(
    "payment method 1 type is credit_card",
    paymentMethod1.payment_type,
    "credit_card",
  );
  TestValidator.equals(
    "payment method 1 provider is Stripe",
    paymentMethod1.provider,
    "Stripe",
  );
  TestValidator.equals(
    "payment method 1 card brand is visa",
    paymentMethod1.card_brand,
    "visa",
  );
  TestValidator.predicate(
    "payment method 1 is default",
    paymentMethod1.is_default === true,
  );

  // Step 7: Verify second payment method properties
  TestValidator.equals(
    "payment method 2 type is debit_card",
    paymentMethod2.payment_type,
    "debit_card",
  );
  TestValidator.equals(
    "payment method 2 provider is Square",
    paymentMethod2.provider,
    "Square",
  );
  TestValidator.equals(
    "payment method 2 card brand is mastercard",
    paymentMethod2.card_brand,
    "mastercard",
  );
  TestValidator.predicate(
    "payment method 2 is not default",
    paymentMethod2.is_default === false,
  );

  // Step 8: Verify third payment method properties
  TestValidator.equals(
    "payment method 3 type is paypal",
    paymentMethod3.payment_type,
    "paypal",
  );
  TestValidator.equals(
    "payment method 3 provider is PayPal",
    paymentMethod3.provider,
    "PayPal",
  );
  TestValidator.predicate(
    "payment method 3 is not default",
    paymentMethod3.is_default === false,
  );

  // Step 9: Verify all payment methods belong to the same buyer
  TestValidator.equals(
    "payment method 1 belongs to buyer",
    paymentMethod1.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "payment method 2 belongs to buyer",
    paymentMethod2.shopping_mall_buyer_id,
    buyer.id,
  );
  TestValidator.equals(
    "payment method 3 belongs to buyer",
    paymentMethod3.shopping_mall_buyer_id,
    buyer.id,
  );

  // Step 10: Verify only one payment method is default
  const defaultCount = [paymentMethod1, paymentMethod2, paymentMethod3].filter(
    (pm) => pm.is_default,
  ).length;
  TestValidator.equals("only one payment method is default", defaultCount, 1);
}
