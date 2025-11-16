import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test registering a digital wallet payment method for a buyer account.
 *
 * This test validates that the shopping mall platform properly supports
 * non-card payment methods such as PayPal, Apple Pay, and Google Pay. Digital
 * wallets represent an important category of payment instruments that don't
 * have traditional card attributes like card numbers or expiration dates.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new buyer account
 * 2. Register a digital wallet payment method (PayPal)
 * 3. Verify the payment method was created successfully
 * 4. Validate that card-specific fields are appropriately null/undefined
 * 5. Confirm digital wallet specific fields are properly populated
 */
export async function test_api_payment_method_creation_digital_wallet(
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

  // Step 2: Register a digital wallet payment method
  const digitalWalletTypes = ["paypal", "apple_pay", "google_pay"] as const;
  const selectedWalletType = RandomGenerator.pick(digitalWalletTypes);
  const providers = ["PayPal", "Apple", "Google", "Stripe", "Square"] as const;
  const selectedProvider = RandomGenerator.pick(providers);

  const paymentMethodData = {
    payment_type: selectedWalletType,
    provider: selectedProvider,
    provider_token: RandomGenerator.alphaNumeric(32),
    billing_name: buyer.full_name,
    billing_postal_code: typia
      .random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<99999>
      >()
      .toString(),
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(createdPaymentMethod);

  // Step 3: Verify the payment method was created successfully
  TestValidator.equals(
    "payment method type matches digital wallet",
    createdPaymentMethod.payment_type,
    selectedWalletType,
  );

  TestValidator.equals(
    "provider matches requested provider",
    createdPaymentMethod.provider,
    selectedProvider,
  );

  TestValidator.equals(
    "billing name matches buyer full name",
    createdPaymentMethod.billing_name,
    buyer.full_name,
  );

  TestValidator.equals(
    "is_default flag is set correctly",
    createdPaymentMethod.is_default,
    true,
  );

  // Step 4: Validate that card-specific fields are null/undefined for digital wallets
  TestValidator.predicate(
    "card_brand should be undefined for digital wallet",
    createdPaymentMethod.card_brand === undefined,
  );

  TestValidator.predicate(
    "last_four_digits should be undefined for digital wallet",
    createdPaymentMethod.last_four_digits === undefined,
  );

  TestValidator.predicate(
    "expiry_month should be undefined for digital wallet",
    createdPaymentMethod.expiry_month === undefined,
  );

  TestValidator.predicate(
    "expiry_year should be undefined for digital wallet",
    createdPaymentMethod.expiry_year === undefined,
  );

  // Step 5: Confirm digital wallet specific fields are properly populated
  TestValidator.predicate(
    "provider_token should be populated",
    createdPaymentMethod.provider_token.length > 0,
  );

  TestValidator.equals(
    "shopping_mall_buyer_id matches authenticated buyer",
    createdPaymentMethod.shopping_mall_buyer_id,
    buyer.id,
  );
}
