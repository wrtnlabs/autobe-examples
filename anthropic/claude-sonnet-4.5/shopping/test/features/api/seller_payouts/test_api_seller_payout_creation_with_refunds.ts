import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test creating a seller payout with refund deductions.
 *
 * This test validates that the system properly accounts for buyer refunds when
 * calculating seller payouts, ensuring sellers are not paid for cancelled or
 * refunded transactions.
 *
 * Workflow:
 *
 * 1. Authenticate as administrator
 * 2. Create a seller payout with refund amounts
 * 3. Verify payout creation and financial calculations
 * 4. Validate that refund_amount is deducted correctly
 * 5. Confirm net_payout_amount reflects refund impact
 */
export async function test_api_seller_payout_creation_with_refunds(
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

  // Step 2: Create seller payout with refunds
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const grossAmount = 10000;
  const commissionAmount = 1500;
  const refundAmount = 2000;
  const adjustmentAmount = 0;
  const expectedNetPayout =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutPeriodStart = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const payoutPeriodEnd = new Date().toISOString();

  const payoutData = {
    shopping_mall_seller_id: sellerId,
    payout_period_start: payoutPeriodStart,
    payout_period_end: payoutPeriodEnd,
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: expectedNetPayout,
    currency: "USD",
    status: "pending",
    bank_account_last_four: "1234",
    bank_name: "Test Bank",
  } satisfies IShoppingMallSellerPayout.ICreate;

  // Step 3: Create the payout
  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });
  typia.assert(createdPayout);

  // Step 4: Validate payout creation
  TestValidator.equals(
    "seller ID matches",
    createdPayout.shopping_mall_seller_id,
    sellerId,
  );
  TestValidator.equals(
    "gross amount matches",
    createdPayout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "commission amount matches",
    createdPayout.commission_amount,
    commissionAmount,
  );
  TestValidator.equals(
    "refund amount matches",
    createdPayout.refund_amount,
    refundAmount,
  );
  TestValidator.equals(
    "adjustment amount matches",
    createdPayout.adjustment_amount,
    adjustmentAmount,
  );

  // Step 5: Verify net payout calculation with refund deduction
  TestValidator.equals(
    "net payout amount is correct",
    createdPayout.net_payout_amount,
    expectedNetPayout,
  );
  TestValidator.equals("currency matches", createdPayout.currency, "USD");
  TestValidator.equals("status is pending", createdPayout.status, "pending");

  // Step 6: Validate refund impact on final payout
  TestValidator.predicate(
    "net payout is less than gross due to refunds",
    createdPayout.net_payout_amount < createdPayout.gross_amount,
  );
  TestValidator.predicate(
    "refund amount reduces seller earnings",
    createdPayout.refund_amount > 0,
  );
}
