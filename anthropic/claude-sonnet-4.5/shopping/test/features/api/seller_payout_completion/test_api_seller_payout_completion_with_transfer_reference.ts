import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test completing a seller payout by updating its status to completed and
 * recording the bank transfer reference number.
 *
 * This test validates the successful completion workflow when funds have been
 * successfully transferred to the seller's bank account. The workflow
 * includes:
 *
 * 1. Authenticate as admin for payout management access
 * 2. Create a seller payout record in pending status
 * 3. Update the payout to completed status while adding transfer_reference and
 *    completed_at timestamp
 *
 * Validation points:
 *
 * - Verify status successfully transitions to completed
 * - Confirm transfer_reference is properly stored for reconciliation purposes
 * - Validate completed_at timestamp is recorded accurately
 * - Ensure the final payout record reflects successful fund transfer
 * - Verify all financial amounts remain consistent throughout the update
 */
export async function test_api_seller_payout_completion_with_transfer_reference(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "SecureAdmin123!",
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create initial seller payout record in pending status
  const payoutPeriodStart = new Date("2024-01-01T00:00:00Z");
  const payoutPeriodEnd = new Date("2024-01-31T23:59:59Z");

  const grossAmount = 50000;
  const commissionAmount = 5000;
  const refundAmount = 500;
  const adjustmentAmount = 0;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutData = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    payout_period_start: payoutPeriodStart.toISOString(),
    payout_period_end: payoutPeriodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: netPayoutAmount,
    currency: "USD",
    status: "pending",
    bank_account_last_four: "5678",
    bank_name: "Example Bank",
    notes: "Monthly payout for January 2024",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });
  typia.assert(createdPayout);

  // Validate initial payout creation
  TestValidator.equals(
    "initial status is pending",
    createdPayout.status,
    "pending",
  );
  TestValidator.equals(
    "gross amount matches",
    createdPayout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "net payout amount matches",
    createdPayout.net_payout_amount,
    netPayoutAmount,
  );

  // Step 3: Update payout to completed status with transfer reference
  const transferReference = `TXN-${typia.random<string & tags.Format<"uuid">>()}`;
  const completedAt = new Date().toISOString();

  const updateData = {
    status: "completed",
    transfer_reference: transferReference,
    completed_at: completedAt,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const updatedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.update(connection, {
      payoutId: createdPayout.id,
      body: updateData,
    });
  typia.assert(updatedPayout);

  // Step 4: Validate the completed payout record
  TestValidator.equals(
    "status transitions to completed",
    updatedPayout.status,
    "completed",
  );

  // Validate transfer reference with proper null handling
  typia.assert<string>(updatedPayout.transfer_reference!);
  TestValidator.equals(
    "transfer reference is stored",
    updatedPayout.transfer_reference,
    transferReference,
  );

  // Validate completed timestamp with proper null handling
  typia.assert<string & tags.Format<"date-time">>(updatedPayout.completed_at!);
  TestValidator.equals(
    "completed timestamp is recorded",
    updatedPayout.completed_at,
    completedAt,
  );

  // Validate financial amounts remain consistent
  TestValidator.equals(
    "gross amount unchanged",
    updatedPayout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "commission amount unchanged",
    updatedPayout.commission_amount,
    commissionAmount,
  );
  TestValidator.equals(
    "refund amount unchanged",
    updatedPayout.refund_amount,
    refundAmount,
  );
  TestValidator.equals(
    "adjustment amount unchanged",
    updatedPayout.adjustment_amount,
    adjustmentAmount,
  );
  TestValidator.equals(
    "net payout amount unchanged",
    updatedPayout.net_payout_amount,
    netPayoutAmount,
  );

  // Validate other payout details are preserved
  TestValidator.equals(
    "payout ID unchanged",
    updatedPayout.id,
    createdPayout.id,
  );
  TestValidator.equals(
    "seller ID unchanged",
    updatedPayout.shopping_mall_seller_id,
    payoutData.shopping_mall_seller_id,
  );
  TestValidator.equals("currency unchanged", updatedPayout.currency, "USD");
  TestValidator.equals(
    "bank account last four unchanged",
    updatedPayout.bank_account_last_four,
    "5678",
  );
  TestValidator.equals(
    "bank name unchanged",
    updatedPayout.bank_name,
    "Example Bank",
  );
}
