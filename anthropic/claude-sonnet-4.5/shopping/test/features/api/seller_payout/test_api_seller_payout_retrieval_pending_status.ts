import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test retrieving a seller payout that is in pending status to verify status
 * tracking and lifecycle management.
 *
 * This test validates that newly created payouts correctly show pending status
 * before bank transfer initiation, and that timestamp fields like initiated_at
 * and completed_at are null for pending payouts. The test verifies that the
 * payout status accurately reflects the transfer has not yet been initiated,
 * that failure_reason is null, and that the payout is waiting for processing.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account
 * 2. Create a seller payout in pending status
 * 3. Retrieve the payout by ID
 * 4. Validate pending status and null timestamp fields
 * 5. Verify all financial data is correctly stored
 */
export async function test_api_seller_payout_retrieval_pending_status(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin123!@#",
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create a seller payout in pending status
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const grossAmount = 10000;
  const commissionAmount = 1500;
  const refundAmount = 200;
  const adjustmentAmount = 50;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutCreateData = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    payout_period_start: thirtyDaysAgo.toISOString(),
    payout_period_end: now.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: netPayoutAmount,
    currency: "USD",
    status: "pending",
    bank_account_last_four: "1234",
    bank_name: "Test Bank",
    transfer_reference: null,
    failure_reason: null,
    notes: "Initial payout calculation",
    initiated_at: null,
    completed_at: null,
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutCreateData,
    });
  typia.assert(createdPayout);

  // Step 3: Retrieve the payout by ID
  const retrievedPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.at(connection, {
      payoutId: createdPayout.id,
    });
  typia.assert(retrievedPayout);

  // Step 4: Validate payout ID matches
  TestValidator.equals(
    "payout ID matches",
    retrievedPayout.id,
    createdPayout.id,
  );

  // Step 5: Validate pending status
  TestValidator.equals(
    "payout status is pending",
    retrievedPayout.status,
    "pending",
  );

  // Step 6: Verify initiated_at is null
  TestValidator.equals(
    "initiated_at is null for pending payout",
    retrievedPayout.initiated_at,
    null,
  );

  // Step 7: Verify completed_at is null
  TestValidator.equals(
    "completed_at is null for pending payout",
    retrievedPayout.completed_at,
    null,
  );

  // Step 8: Verify failure_reason is null
  TestValidator.equals(
    "failure_reason is null for pending payout",
    retrievedPayout.failure_reason,
    null,
  );

  // Step 9: Validate financial amounts
  TestValidator.equals(
    "gross amount matches",
    retrievedPayout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "commission amount matches",
    retrievedPayout.commission_amount,
    commissionAmount,
  );
  TestValidator.equals(
    "refund amount matches",
    retrievedPayout.refund_amount,
    refundAmount,
  );
  TestValidator.equals(
    "adjustment amount matches",
    retrievedPayout.adjustment_amount,
    adjustmentAmount,
  );
  TestValidator.equals(
    "net payout amount matches",
    retrievedPayout.net_payout_amount,
    netPayoutAmount,
  );

  // Step 10: Validate currency
  TestValidator.equals("currency matches", retrievedPayout.currency, "USD");

  // Step 11: Validate banking information
  TestValidator.equals(
    "bank account last four matches",
    retrievedPayout.bank_account_last_four,
    "1234",
  );
  TestValidator.equals(
    "bank name matches",
    retrievedPayout.bank_name,
    "Test Bank",
  );
}
