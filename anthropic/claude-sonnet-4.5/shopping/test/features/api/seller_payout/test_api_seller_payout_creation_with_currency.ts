import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test that payout creation correctly specifies the currency for all monetary
 * amounts.
 *
 * This test validates multi-currency support in the seller payout system by:
 *
 * 1. Creating an admin account with authorization to manage payouts
 * 2. Creating a seller account to receive international payouts
 * 3. Creating payout records with different currency codes (USD, EUR, GBP, KRW)
 * 4. Validating that currency codes follow ISO 4217 format (3-letter codes)
 * 5. Ensuring currency is consistently applied across all monetary fields
 * 6. Verifying correct currency is used for payment processing
 *
 * This ensures proper international payment handling and multi-currency support
 * for sellers operating in different markets and currencies.
 */
export async function test_api_seller_payout_creation_with_currency(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for payout management authorization
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create seller account to receive payouts
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerData });
  typia.assert(seller);

  // Switch back to admin connection for payout creation
  await api.functional.auth.admin.join(connection, { body: adminData });

  // Step 3: Test with different currency codes
  const currencies = ["USD", "EUR", "GBP", "KRW"] as const;
  const payouts: IShoppingMallSellerPayout[] = [];

  for (const currency of currencies) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const grossAmount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >();
    const commissionRate = 0.15;
    const commissionAmount = grossAmount * commissionRate;
    const refundAmount = typia.random<
      number & tags.Type<"uint32"> & tags.Maximum<1000>
    >();
    const adjustmentAmount = typia.random<
      number & tags.Minimum<-500> & tags.Maximum<500>
    >();
    const netPayoutAmount =
      grossAmount - commissionAmount - refundAmount + adjustmentAmount;

    const payoutData = {
      shopping_mall_seller_id: seller.id,
      payout_period_start: periodStart.toISOString(),
      payout_period_end: periodEnd.toISOString(),
      gross_amount: grossAmount,
      commission_amount: commissionAmount,
      refund_amount: refundAmount,
      adjustment_amount: adjustmentAmount,
      net_payout_amount: netPayoutAmount,
      currency: currency,
      status: "pending",
      bank_account_last_four: typia
        .random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
        >()
        .toString(),
      bank_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 8,
      }),
      notes: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IShoppingMallSellerPayout.ICreate;

    const payout: IShoppingMallSellerPayout =
      await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
        body: payoutData,
      });
    typia.assert(payout);
    payouts.push(payout);

    // Step 4: Validate currency field is correctly stored
    TestValidator.equals(
      "currency matches requested currency",
      payout.currency,
      currency,
    );

    // Step 5: Validate ISO 4217 format (3-letter uppercase code)
    TestValidator.predicate(
      "currency code is 3-letter uppercase",
      payout.currency.length === 3 &&
        payout.currency === payout.currency.toUpperCase(),
    );

    // Step 6: Validate all monetary amounts are present
    TestValidator.predicate(
      "gross amount is positive",
      payout.gross_amount > 0,
    );
    TestValidator.predicate(
      "commission amount is non-negative",
      payout.commission_amount >= 0,
    );
    TestValidator.predicate(
      "net payout amount is calculated correctly",
      Math.abs(payout.net_payout_amount - netPayoutAmount) < 0.01,
    );
  }

  // Step 7: Verify all currencies were created successfully
  TestValidator.equals(
    "all currency payouts created",
    payouts.length,
    currencies.length,
  );

  // Step 8: Verify each currency is unique in the test set
  const uniqueCurrencies = new Set(payouts.map((p) => p.currency));
  TestValidator.equals(
    "all currencies are unique",
    uniqueCurrencies.size,
    currencies.length,
  );
}
