import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test creating a payment method with billing_postal_code for AVS validation.
 *
 * This test validates that payment methods can be created with billing postal
 * codes for Address Verification Service (AVS) checks during payment
 * processing. The billing postal code is essential for fraud prevention as it
 * validates that the buyer has legitimate access to the payment method.
 *
 * Workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Create a payment method with billing_postal_code included
 * 3. Validate the payment method is created successfully
 * 4. Verify the billing_postal_code is correctly stored and returned
 */
export async function test_api_payment_method_creation_with_billing_postal_code(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
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

  // Step 2: Create a payment method with billing_postal_code for AVS validation
  const billingPostalCode = typia.random<string>();

  const paymentMethodData = {
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
    billing_postal_code: billingPostalCode,
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(paymentMethod);

  // Step 3: Validate that the payment method was created with correct data
  TestValidator.equals(
    "payment method type matches",
    paymentMethod.payment_type,
    paymentMethodData.payment_type,
  );
  TestValidator.equals(
    "payment provider matches",
    paymentMethod.provider,
    paymentMethodData.provider,
  );
  TestValidator.equals(
    "card brand matches",
    paymentMethod.card_brand,
    paymentMethodData.card_brand,
  );
  TestValidator.equals(
    "billing name matches",
    paymentMethod.billing_name,
    paymentMethodData.billing_name,
  );

  // Step 4: Verify the billing_postal_code is correctly stored for AVS checks
  TestValidator.equals(
    "billing postal code is stored correctly",
    paymentMethod.billing_postal_code,
    billingPostalCode,
  );

  // Verify the payment method is set as default
  TestValidator.equals(
    "payment method is set as default",
    paymentMethod.is_default,
    true,
  );

  // Verify the buyer association
  TestValidator.equals(
    "payment method is associated with correct buyer",
    paymentMethod.shopping_mall_buyer_id,
    buyer.id,
  );
}
