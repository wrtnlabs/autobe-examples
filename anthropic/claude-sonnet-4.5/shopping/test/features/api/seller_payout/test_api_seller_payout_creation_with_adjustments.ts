import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test creating seller payouts with manual adjustments to validate adjustment
 * handling.
 *
 * This test validates the creation of seller payouts that include manual
 * adjustments to the payout amount. It tests both positive adjustments (credits
 * for promotional bonuses, dispute resolutions in seller's favor) and negative
 * adjustments (penalty charges, fee corrections).
 *
 * The test verifies:
 *
 * 1. Adjustment amounts are properly applied to the net payout calculation
 * 2. Notes field can document the reason for adjustments
 * 3. System maintains proper audit trail for non-standard payout scenarios
 * 4. Financial calculations are accurate
 *
 * Test steps:
 *
 * 1. Authenticate as administrator
 * 2. Generate seller ID for payout reference
 * 3. Create payout with positive adjustment
 * 4. Validate positive adjustment payout
 * 5. Create payout with negative adjustment
 * 6. Validate negative adjustment payout
 */
export async function test_api_seller_payout_creation_with_adjustments(
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

  // Step 2: Generate seller ID for payout reference
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create payout with positive adjustment (promotional bonus)
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const grossAmount = 10000;
  const commissionAmount = 1500;
  const refundAmount = 500;
  const positiveAdjustment = 300;
  const expectedNetWithPositive =
    grossAmount - commissionAmount - refundAmount + positiveAdjustment;

  const positiveAdjustmentPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: sellerId,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: periodEnd.toISOString(),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        refund_amount: refundAmount,
        adjustment_amount: positiveAdjustment,
        net_payout_amount: expectedNetWithPositive,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        notes: "Promotional bonus credit for Q4 performance",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(positiveAdjustmentPayout);

  // Step 4: Validate positive adjustment payout
  TestValidator.equals(
    "positive adjustment payout seller ID matches",
    positiveAdjustmentPayout.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "positive adjustment amount is correct",
    positiveAdjustmentPayout.adjustment_amount,
    positiveAdjustment,
  );
  TestValidator.equals(
    "net payout with positive adjustment is correct",
    positiveAdjustmentPayout.net_payout_amount,
    expectedNetWithPositive,
  );
  TestValidator.equals(
    "positive adjustment notes are recorded",
    positiveAdjustmentPayout.notes,
    "Promotional bonus credit for Q4 performance",
  );
  TestValidator.equals(
    "payout status is pending",
    positiveAdjustmentPayout.status,
    "pending",
  );

  // Step 5: Create payout with negative adjustment (penalty charge)
  const negativeAdjustment = -200;
  const expectedNetWithNegative =
    grossAmount - commissionAmount - refundAmount + negativeAdjustment;

  const negativeAdjustmentPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: sellerId,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: periodEnd.toISOString(),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        refund_amount: refundAmount,
        adjustment_amount: negativeAdjustment,
        net_payout_amount: expectedNetWithNegative,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "5678",
        bank_name: "Test Bank",
        notes: "Penalty charge for late shipment violations",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(negativeAdjustmentPayout);

  // Step 6: Validate negative adjustment payout
  TestValidator.equals(
    "negative adjustment payout seller ID matches",
    negativeAdjustmentPayout.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "negative adjustment amount is correct",
    negativeAdjustmentPayout.adjustment_amount,
    negativeAdjustment,
  );
  TestValidator.equals(
    "net payout with negative adjustment is correct",
    negativeAdjustmentPayout.net_payout_amount,
    expectedNetWithNegative,
  );
  TestValidator.equals(
    "negative adjustment notes are recorded",
    negativeAdjustmentPayout.notes,
    "Penalty charge for late shipment violations",
  );

  // Step 7: Verify financial calculation formula
  TestValidator.predicate(
    "positive adjustment calculation formula is valid",
    positiveAdjustmentPayout.net_payout_amount ===
      positiveAdjustmentPayout.gross_amount -
        positiveAdjustmentPayout.commission_amount -
        positiveAdjustmentPayout.refund_amount +
        positiveAdjustmentPayout.adjustment_amount,
  );

  TestValidator.predicate(
    "negative adjustment calculation formula is valid",
    negativeAdjustmentPayout.net_payout_amount ===
      negativeAdjustmentPayout.gross_amount -
        negativeAdjustmentPayout.commission_amount -
        negativeAdjustmentPayout.refund_amount +
        negativeAdjustmentPayout.adjustment_amount,
  );
}
