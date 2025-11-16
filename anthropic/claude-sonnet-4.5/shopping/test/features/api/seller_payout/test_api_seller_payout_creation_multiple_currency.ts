import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test creating seller payouts in different currencies to validate
 * multi-currency support.
 *
 * This test validates the platform's capability to handle international seller
 * payments by creating payouts in various ISO 4217 currency codes (USD, EUR,
 * GBP, JPY). It ensures the system correctly processes and stores
 * multi-currency payout data for global marketplace operations.
 *
 * Test Flow:
 *
 * 1. Authenticate as platform administrator
 * 2. Create seller payouts in USD (United States Dollar)
 * 3. Create seller payouts in EUR (European Euro)
 * 4. Create seller payouts in GBP (British Pound Sterling)
 * 5. Create seller payouts in JPY (Japanese Yen)
 * 6. Validate currency codes are correctly stored
 * 7. Verify monetary amounts are properly associated with currencies
 */
export async function test_api_seller_payout_creation_multiple_currency(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Define currencies to test (ISO 4217 codes)
  const currencies = ["USD", "EUR", "GBP", "JPY"] as const;

  // Step 3: Create seller payout for each currency
  const payouts: IShoppingMallSellerPayout[] = [];

  for (const currency of currencies) {
    // Generate payout period dates
    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Generate realistic amounts based on currency
    const grossAmount = currency === "JPY" ? 100000 : 1000.5;
    const commissionAmount = currency === "JPY" ? 15000 : 150.08;
    const refundAmount = currency === "JPY" ? 5000 : 50.25;
    const adjustmentAmount = currency === "JPY" ? 0 : 0;
    const netPayoutAmount =
      grossAmount - commissionAmount - refundAmount + adjustmentAmount;

    const payoutData = {
      shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
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
      bank_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSellerPayout.ICreate;

    const payout = await api.functional.shoppingMall.admin.sellerPayouts.create(
      connection,
      {
        body: payoutData,
      },
    );
    typia.assert(payout);

    // Validate currency code is correctly stored
    TestValidator.equals("currency code matches", payout.currency, currency);

    // Validate monetary amounts are stored correctly
    TestValidator.equals(
      "gross amount matches",
      payout.gross_amount,
      grossAmount,
    );
    TestValidator.equals(
      "commission amount matches",
      payout.commission_amount,
      commissionAmount,
    );
    TestValidator.equals(
      "refund amount matches",
      payout.refund_amount,
      refundAmount,
    );
    TestValidator.equals(
      "net payout amount matches",
      payout.net_payout_amount,
      netPayoutAmount,
    );

    payouts.push(payout);
  }

  // Step 4: Verify all currencies were created successfully
  TestValidator.equals(
    "all currencies created",
    payouts.length,
    currencies.length,
  );

  // Step 5: Validate each payout has unique currency
  const uniqueCurrencies = [...new Set(payouts.map((p) => p.currency))];
  TestValidator.equals(
    "all currencies are unique",
    uniqueCurrencies.length,
    currencies.length,
  );

  // Step 6: Verify currency variety (USD, EUR, GBP, JPY all present)
  for (const currency of currencies) {
    const hasCurrency = payouts.some((p) => p.currency === currency);
    TestValidator.predicate(`${currency} payout exists`, hasCurrency);
  }
}
