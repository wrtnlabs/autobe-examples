import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test marking a seller payout as failed and documenting the failure reason.
 *
 * This test validates the error handling workflow when bank transfers cannot be
 * completed due to payment processing issues. It verifies that the system
 * properly documents failure reasons with actionable information, maintains
 * data integrity for failed payment investigation, and ensures payout status
 * transitions correctly to the failed state.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access payout management functions
 * 2. Create a seller payout record in pending status with complete financial data
 * 3. Update the payout status to failed with failure_reason and explanatory notes
 * 4. Validate status transition, failure documentation, and data integrity
 *
 * Validation points:
 *
 * - Status successfully transitions to "failed"
 * - Failure_reason is properly recorded with actionable error code
 * - Notes field contains detailed explanation of failure circumstances
 * - Completed_at remains null for failed payouts
 * - Payout record maintains data integrity for investigation and resolution
 */
export async function test_api_seller_payout_failure_documentation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Create a seller payout in pending status
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const grossAmount = 10000;
  const commissionAmount = 1500;
  const refundAmount = 500;
  const adjustmentAmount = 0;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutData = {
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
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });
  typia.assert(createdPayout);

  // Step 3: Update payout to failed status with failure documentation
  const failureReason = "bank_rejected";
  const failureNotes =
    "Bank rejected the transfer due to account verification failure. Seller needs to update banking information and verify account ownership before retry.";

  const updateData = {
    status: "failed",
    failure_reason: failureReason,
    notes: failureNotes,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const updatedPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.update(connection, {
      payoutId: createdPayout.id,
      body: updateData,
    });
  typia.assert(updatedPayout);

  // Step 4: Validate the failed payout state
  TestValidator.equals(
    "payout status should be failed",
    updatedPayout.status,
    "failed",
  );

  TestValidator.equals(
    "failure reason should be documented",
    updatedPayout.failure_reason,
    failureReason,
  );

  TestValidator.equals(
    "failure notes should contain detailed explanation",
    updatedPayout.notes,
    failureNotes,
  );

  TestValidator.predicate(
    "completed_at should remain null for failed payouts",
    updatedPayout.completed_at === null ||
      updatedPayout.completed_at === undefined,
  );

  TestValidator.equals(
    "payout ID should remain unchanged",
    updatedPayout.id,
    createdPayout.id,
  );

  TestValidator.equals(
    "net payout amount should remain unchanged",
    updatedPayout.net_payout_amount,
    netPayoutAmount,
  );
}
