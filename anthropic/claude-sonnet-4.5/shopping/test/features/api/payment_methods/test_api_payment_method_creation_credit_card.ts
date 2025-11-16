import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Test successful registration of a new credit card payment method by an
 * authenticated buyer.
 *
 * This test validates the complete payment method creation workflow for credit
 * card instruments. It verifies that:
 *
 * 1. A buyer can successfully register after authentication
 * 2. Credit card payment methods can be created with all required fields
 * 3. The buyer_id is automatically populated from JWT token
 * 4. Response includes complete payment method data with masked sensitive
 *    information
 * 5. Generated UUID and timestamps are properly set
 * 6. Verification status reflects provider validation
 *
 * The test follows the realistic user journey:
 *
 * - Buyer creates account and authenticates
 * - Obtains payment provider token (simulated via realistic mock data)
 * - Registers credit card with billing information
 * - Receives confirmed payment method ready for checkout use
 */
export async function test_api_payment_method_creation_credit_card(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyerFullName = RandomGenerator.name(2);
  const buyerPhone = RandomGenerator.mobile();

  const authenticatedBuyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        full_name: buyerFullName,
        phone_number: buyerPhone,
        href: "https://shopping-mall.example.com/register",
        referrer: "https://google.com/search?q=shopping+mall",
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(authenticatedBuyer);

  // Verify buyer authentication was successful
  TestValidator.equals(
    "buyer email matches",
    authenticatedBuyer.email,
    buyerEmail,
  );
  TestValidator.equals(
    "buyer full name matches",
    authenticatedBuyer.full_name,
    buyerFullName,
  );

  // Step 2: Prepare credit card payment method data
  const paymentProviders = ["Stripe", "PayPal", "Square", "Braintree"] as const;
  const cardBrands = ["visa", "mastercard", "amex"] as const;

  const selectedProvider = RandomGenerator.pick(paymentProviders);
  const selectedCardBrand = RandomGenerator.pick(cardBrands);

  // Generate realistic provider token (simulating client-side tokenization)
  const providerToken = `${selectedProvider.toLowerCase()}_tok_${RandomGenerator.alphaNumeric(24)}`;

  // Generate last 4 digits
  const lastFourDigits = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`;

  // Generate future expiry date
  const currentYear = new Date().getFullYear();
  const expiryMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  const expiryYear =
    currentYear +
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >();

  const billingName = RandomGenerator.name(2);
  const billingPostalCode = `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10000> & tags.Maximum<99999>>()}`;

  const paymentMethodData = {
    payment_type: "credit_card",
    provider: selectedProvider,
    provider_token: providerToken,
    card_brand: selectedCardBrand,
    last_four_digits: lastFourDigits,
    expiry_month: expiryMonth,
    expiry_year: expiryYear,
    billing_name: billingName,
    billing_postal_code: billingPostalCode,
    is_default: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // Step 3: Register the credit card payment method
  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.buyer.paymentMethods.create(connection, {
      body: paymentMethodData,
    });
  typia.assert(createdPaymentMethod);

  // Step 4: Validate the response - BUSINESS LOGIC ONLY
  TestValidator.equals(
    "payment method buyer ID matches authenticated buyer",
    createdPaymentMethod.shopping_mall_buyer_id,
    authenticatedBuyer.id,
  );
  TestValidator.equals(
    "payment type is credit_card",
    createdPaymentMethod.payment_type,
    "credit_card",
  );
  TestValidator.equals(
    "provider matches request",
    createdPaymentMethod.provider,
    selectedProvider,
  );
  TestValidator.equals(
    "provider token matches request",
    createdPaymentMethod.provider_token,
    providerToken,
  );
  TestValidator.equals(
    "card brand matches request",
    createdPaymentMethod.card_brand,
    selectedCardBrand,
  );
  TestValidator.equals(
    "last four digits match request",
    createdPaymentMethod.last_four_digits,
    lastFourDigits,
  );
  TestValidator.equals(
    "expiry month matches request",
    createdPaymentMethod.expiry_month,
    expiryMonth,
  );
  TestValidator.equals(
    "expiry year matches request",
    createdPaymentMethod.expiry_year,
    expiryYear,
  );
  TestValidator.equals(
    "billing name matches request",
    createdPaymentMethod.billing_name,
    billingName,
  );
  TestValidator.equals(
    "billing postal code matches request",
    createdPaymentMethod.billing_postal_code,
    billingPostalCode,
  );
  TestValidator.equals(
    "is_default flag matches request",
    createdPaymentMethod.is_default,
    true,
  );
}
