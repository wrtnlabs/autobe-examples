import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test registering a credit card payment method for the authenticated buyer.
 *
 * This test validates the complete payment method registration workflow with
 * credit card details.
 *
 * Steps:
 *
 * 1. Authenticate as buyer by joining with valid credentials
 * 2. Register a payment method with credit card details
 * 3. Verify the created payment method has all required information
 * 4. Validate automatic buyer_id association and timestamps
 */
export async function test_api_payment_method_credit_card_registration(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as buyer
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

  // Step 2: Register credit card payment method
  const expiryMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  const expiryYear = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<2024>
  >();
  const lastFourDigits = RandomGenerator.alphaNumeric(4);

  const paymentMethodData = {
    payment_type: "credit_card",
    provider: "Stripe",
    provider_token: RandomGenerator.alphaNumeric(32),
    card_brand: "visa",
    last_four_digits: lastFourDigits,
    expiry_month: expiryMonth,
    expiry_year: expiryYear,
    billing_name: RandomGenerator.name(),
    billing_postal_code: RandomGenerator.alphaNumeric(5),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(paymentMethod);

  // Step 3: Verify payment method details
  TestValidator.equals(
    "payment type matches",
    paymentMethod.payment_type,
    "credit_card",
  );
  TestValidator.equals("provider matches", paymentMethod.provider, "Stripe");
  TestValidator.equals(
    "provider token matches",
    paymentMethod.provider_token,
    paymentMethodData.provider_token,
  );
  TestValidator.equals("card brand matches", paymentMethod.card_brand, "visa");
  TestValidator.equals(
    "last four digits match",
    paymentMethod.last_four_digits,
    lastFourDigits,
  );
  TestValidator.equals(
    "expiry month matches",
    paymentMethod.expiry_month,
    expiryMonth,
  );
  TestValidator.equals(
    "expiry year matches",
    paymentMethod.expiry_year,
    expiryYear,
  );
  TestValidator.equals(
    "billing name matches",
    paymentMethod.billing_name,
    paymentMethodData.billing_name,
  );
  TestValidator.equals(
    "billing postal code matches",
    paymentMethod.billing_postal_code,
    paymentMethodData.billing_postal_code,
  );
  TestValidator.equals("is default matches", paymentMethod.is_default, true);
  TestValidator.equals(
    "buyer ID association matches",
    paymentMethod.shopping_mall_buyer_id,
    buyer.id,
  );
}
