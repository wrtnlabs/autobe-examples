import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test the business rule that ensures exclusive default status when switching
 * the default payment method from one to another.
 *
 * This scenario creates multiple payment methods for a buyer and validates that
 * switching the default payment method correctly updates the new default
 * (setting is_default to true). Due to API limitations (no list endpoint
 * available), we can only verify that the setDefault operation returns the
 * correct is_default=true status for the target payment method.
 *
 * Test Flow:
 *
 * 1. Create a buyer account through authentication
 * 2. Register three different payment methods with different providers
 * 3. Set the first payment method as default and verify is_default=true
 * 4. Switch to the second payment method as default and verify is_default=true
 * 5. Switch to the third payment method as default and verify is_default=true
 *
 * Note: Full verification of mutual exclusivity (that other payment methods
 * have is_default=false) cannot be implemented because the API does not provide
 * a list/index endpoint for payment methods.
 */
export async function test_api_payment_method_default_switching(
  connection: api.IConnection,
) {
  // Step 1: Create buyer account
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

  // Step 2: Register first payment method (credit card with Stripe)
  const paymentMethod1: IShoppingMallPaymentMethod =
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
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: false,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod1);

  // Step 3: Register second payment method (debit card with PayPal)
  const paymentMethod2: IShoppingMallPaymentMethod =
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
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: false,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod2);

  // Step 4: Register third payment method (credit card with Square)
  const paymentMethod3: IShoppingMallPaymentMethod =
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
        billing_postal_code: RandomGenerator.alphaNumeric(5),
        is_default: false,
      } satisfies IShoppingMallPaymentMethod.ICreate,
    });
  typia.assert(paymentMethod3);

  // Step 5: Set first payment method as default
  const updatedMethod1: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.setDefault(
      connection,
      {
        paymentMethodId: paymentMethod1.id,
      },
    );
  typia.assert(updatedMethod1);
  TestValidator.predicate(
    "first payment method is now default",
    updatedMethod1.is_default === true,
  );
  TestValidator.equals(
    "updated method ID matches first payment method",
    updatedMethod1.id,
    paymentMethod1.id,
  );

  // Step 6: Switch default to second payment method
  const updatedMethod2: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.setDefault(
      connection,
      {
        paymentMethodId: paymentMethod2.id,
      },
    );
  typia.assert(updatedMethod2);
  TestValidator.predicate(
    "second payment method is now default",
    updatedMethod2.is_default === true,
  );
  TestValidator.equals(
    "updated method ID matches second payment method",
    updatedMethod2.id,
    paymentMethod2.id,
  );

  // Step 7: Switch default to third payment method
  const updatedMethod3: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.setDefault(
      connection,
      {
        paymentMethodId: paymentMethod3.id,
      },
    );
  typia.assert(updatedMethod3);
  TestValidator.predicate(
    "third payment method is now default",
    updatedMethod3.is_default === true,
  );
  TestValidator.equals(
    "updated method ID matches third payment method",
    updatedMethod3.id,
    paymentMethod3.id,
  );
}
