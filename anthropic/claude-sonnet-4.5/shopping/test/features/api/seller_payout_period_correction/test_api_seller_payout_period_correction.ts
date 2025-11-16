import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test updating seller payout period boundaries to correct earnings calculation
 * window.
 *
 * This test validates that administrators can modify the time period covered by
 * a payout when initial date boundaries were set incorrectly. The scenario
 * simulates correcting payout_period_start and payout_period_end values while
 * documenting the reason for the period correction.
 *
 * Workflow:
 *
 * 1. Authenticate as admin for payout management access
 * 2. Create a seller payout record with initial (incorrect) period dates
 * 3. Update the payout with corrected payout_period_start and payout_period_end
 * 4. Validate period dates are updated correctly and maintain logical consistency
 * 5. Verify notes field documents the correction reason
 */
export async function test_api_seller_payout_period_correction(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password: "SecureAdminPass123!",
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: "https://admin.shoppingmall.com/payouts" satisfies string &
      tags.Format<"uri">,
    referrer: "https://admin.shoppingmall.com/dashboard" satisfies string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // Step 2: Create seller payout with incorrect period dates
  const now = new Date();
  const initialPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const initialPeriodEnd = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

  const payoutCreateBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    payout_period_start: initialPeriodStart.toISOString(),
    payout_period_end: initialPeriodEnd.toISOString(),
    gross_amount: 15000.5,
    commission_amount: 1500.05,
    refund_amount: 200.0,
    adjustment_amount: 0,
    net_payout_amount: 13300.45,
    currency: "USD",
    status: "pending",
    bank_account_last_four: "1234",
    bank_name: "First National Bank",
    notes: "Initial payout calculation with incorrect period dates",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutCreateBody,
    });
  typia.assert(createdPayout);

  // Step 3: Update payout with corrected period boundaries
  const correctedPeriodStart = new Date(
    now.getTime() - 45 * 24 * 60 * 60 * 1000,
  );
  const correctedPeriodEnd = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

  const payoutUpdateBody = {
    payout_period_start: correctedPeriodStart.toISOString(),
    payout_period_end: correctedPeriodEnd.toISOString(),
    notes:
      "Period corrected: Initial dates excluded delayed order data. Extended period start from 30 days to 45 days ago, and end from 15 days to 20 days ago to include all qualifying orders.",
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const updatedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.update(connection, {
      payoutId: createdPayout.id,
      body: payoutUpdateBody,
    });
  typia.assert(updatedPayout);

  // Step 4: Validate corrections
  TestValidator.equals(
    "payout ID remains unchanged",
    updatedPayout.id,
    createdPayout.id,
  );

  TestValidator.equals(
    "payout period start corrected to earlier date",
    updatedPayout.payout_period_start,
    correctedPeriodStart.toISOString(),
  );

  TestValidator.equals(
    "payout period end corrected to later date",
    updatedPayout.payout_period_end,
    correctedPeriodEnd.toISOString(),
  );

  const periodStartDate = new Date(updatedPayout.payout_period_start);
  const periodEndDate = new Date(updatedPayout.payout_period_end);

  TestValidator.predicate(
    "period end date is after period start date",
    periodEndDate.getTime() > periodStartDate.getTime(),
  );

  TestValidator.predicate(
    "notes field documents the correction reason",
    updatedPayout.notes !== null &&
      updatedPayout.notes !== undefined &&
      updatedPayout.notes.includes("Period corrected"),
  );

  TestValidator.equals(
    "seller ID unchanged after update",
    updatedPayout.shopping_mall_seller_id,
    createdPayout.shopping_mall_seller_id,
  );

  TestValidator.equals(
    "net payout amount unchanged",
    updatedPayout.net_payout_amount,
    createdPayout.net_payout_amount,
  );

  TestValidator.equals(
    "payout status remains pending",
    updatedPayout.status,
    "pending",
  );
}
