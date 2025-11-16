import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test the complete workflow of creating a seller payout for a standard
 * earnings period.
 *
 * This test validates that an administrator can successfully create a payout
 * record with all required financial details including gross amount, commission
 * deductions, refund adjustments, and final net payout calculation. The test
 * verifies that all monetary calculations are correct (gross_amount -
 * commission_amount - refund_amount + adjustment_amount = net_payout_amount),
 * the payout status is properly initialized to 'pending', and all required
 * fields are populated correctly.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as administrator
 * 2. Prepare payout financial data with realistic amounts
 * 3. Create seller payout transaction with all required fields
 * 4. Validate the created payout record
 * 5. Verify financial calculations are correct
 * 6. Confirm payout status is set to 'pending'
 */
export async function test_api_seller_payout_creation_standard_period(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin@12345",
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Prepare payout financial data with realistic amounts
  const grossAmount = 10000;
  const commissionAmount = 1500;
  const refundAmount = 500;
  const adjustmentAmount = 100;
  const expectedNetPayout =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutPeriodStart = new Date("2024-01-01T00:00:00Z").toISOString();
  const payoutPeriodEnd = new Date("2024-01-31T23:59:59Z").toISOString();

  // Step 3: Create seller payout transaction with all required fields
  const sellerId = typia.random<string & tags.Format<"uuid">>();

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

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });

  // Step 4: Validate the created payout record
  typia.assert(createdPayout);

  // Step 5: Verify financial calculations are correct
  TestValidator.equals(
    "net payout amount matches expected calculation",
    createdPayout.net_payout_amount,
    expectedNetPayout,
  );

  TestValidator.equals(
    "gross amount is correctly stored",
    createdPayout.gross_amount,
    grossAmount,
  );

  TestValidator.equals(
    "commission amount is correctly stored",
    createdPayout.commission_amount,
    commissionAmount,
  );

  TestValidator.equals(
    "refund amount is correctly stored",
    createdPayout.refund_amount,
    refundAmount,
  );

  TestValidator.equals(
    "adjustment amount is correctly stored",
    createdPayout.adjustment_amount,
    adjustmentAmount,
  );

  // Step 6: Confirm payout status is set to 'pending'
  TestValidator.equals(
    "payout status is initialized to pending",
    createdPayout.status,
    "pending",
  );

  // Additional validations
  TestValidator.equals(
    "payout period start date matches",
    createdPayout.payout_period_start,
    payoutPeriodStart,
  );

  TestValidator.equals(
    "payout period end date matches",
    createdPayout.payout_period_end,
    payoutPeriodEnd,
  );

  TestValidator.equals(
    "currency is correctly set",
    createdPayout.currency,
    "USD",
  );

  TestValidator.equals(
    "seller ID matches",
    createdPayout.shopping_mall_seller_id,
    sellerId,
  );
}
