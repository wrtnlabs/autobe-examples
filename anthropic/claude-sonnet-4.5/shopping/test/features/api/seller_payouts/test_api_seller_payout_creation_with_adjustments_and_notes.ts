import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test payout creation with manual adjustments and explanatory notes.
 *
 * This test validates that the payout creation API supports manual adjustments
 * with corresponding notes for transparency and audit trails. It creates
 * payouts with both positive and negative adjustments, verifies the adjustment
 * amounts are correctly applied to the net payout calculation, and ensures
 * notes are properly stored and accessible.
 *
 * Test Flow:
 *
 * 1. Register admin account for payout creation authorization
 * 2. Register seller account to receive payouts
 * 3. Create payout with positive adjustment and explanatory note
 * 4. Validate adjustment increases net payout correctly
 * 5. Verify notes are stored and accessible
 * 6. Create payout with negative adjustment and explanatory note
 * 7. Validate adjustment decreases net payout correctly
 * 8. Ensure all adjustment information is transparent to seller
 */
export async function test_api_seller_payout_creation_with_adjustments_and_notes(
  connection: api.IConnection,
) {
  // Step 1: Register admin account for authorization
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
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Step 2: Register seller account to receive payouts
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.paragraph({ sentences: 5 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 3: Create payout with positive adjustment and explanatory note
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const grossAmount = 10000;
  const commissionAmount = 1500;
  const refundAmount = 500;
  const positiveAdjustment = 250;

  const positiveAdjustmentNote =
    "Promotional credit for early platform adoption and excellent seller performance";

  const expectedNetWithPositiveAdjustment =
    grossAmount - commissionAmount - refundAmount + positiveAdjustment;

  const payoutWithPositiveAdjustment = {
    shopping_mall_seller_id: seller.id,
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: positiveAdjustment,
    net_payout_amount: expectedNetWithPositiveAdjustment,
    currency: "USD",
    status: "pending",
    notes: positiveAdjustmentNote,
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayoutPositive: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutWithPositiveAdjustment,
    });
  typia.assert(createdPayoutPositive);

  // Step 4: Validate positive adjustment is correctly stored
  TestValidator.equals(
    "positive adjustment amount matches",
    createdPayoutPositive.adjustment_amount,
    positiveAdjustment,
  );

  TestValidator.equals(
    "positive adjustment notes stored",
    createdPayoutPositive.notes,
    positiveAdjustmentNote,
  );

  TestValidator.equals(
    "net payout reflects positive adjustment",
    createdPayoutPositive.net_payout_amount,
    expectedNetWithPositiveAdjustment,
  );

  TestValidator.predicate(
    "positive adjustment increases net payout",
    createdPayoutPositive.net_payout_amount >
      grossAmount - commissionAmount - refundAmount,
  );

  // Step 5: Create payout with negative adjustment and explanatory note
  const negativeAdjustment = -300;
  const negativeAdjustmentNote =
    "Penalty charge for late order fulfillment and customer service violations";

  const expectedNetWithNegativeAdjustment =
    grossAmount - commissionAmount - refundAmount + negativeAdjustment;

  const payoutWithNegativeAdjustment = {
    shopping_mall_seller_id: seller.id,
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: negativeAdjustment,
    net_payout_amount: expectedNetWithNegativeAdjustment,
    currency: "USD",
    status: "pending",
    notes: negativeAdjustmentNote,
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayoutNegative: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutWithNegativeAdjustment,
    });
  typia.assert(createdPayoutNegative);

  // Step 6: Validate negative adjustment is correctly stored
  TestValidator.equals(
    "negative adjustment amount matches",
    createdPayoutNegative.adjustment_amount,
    negativeAdjustment,
  );

  TestValidator.equals(
    "negative adjustment notes stored",
    createdPayoutNegative.notes,
    negativeAdjustmentNote,
  );

  TestValidator.equals(
    "net payout reflects negative adjustment",
    createdPayoutNegative.net_payout_amount,
    expectedNetWithNegativeAdjustment,
  );

  TestValidator.predicate(
    "negative adjustment decreases net payout",
    createdPayoutNegative.net_payout_amount <
      grossAmount - commissionAmount - refundAmount,
  );

  // Step 7: Verify both payouts reference the same seller
  TestValidator.equals(
    "positive adjustment payout seller ID",
    createdPayoutPositive.shopping_mall_seller_id,
    seller.id,
  );

  TestValidator.equals(
    "negative adjustment payout seller ID",
    createdPayoutNegative.shopping_mall_seller_id,
    seller.id,
  );

  // Step 8: Validate that notes provide transparency
  TestValidator.predicate(
    "positive adjustment note is meaningful",
    createdPayoutPositive.notes !== null &&
      createdPayoutPositive.notes !== undefined &&
      createdPayoutPositive.notes.length > 10,
  );

  TestValidator.predicate(
    "negative adjustment note is meaningful",
    createdPayoutNegative.notes !== null &&
      createdPayoutNegative.notes !== undefined &&
      createdPayoutNegative.notes.length > 10,
  );
}
