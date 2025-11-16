import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test updating a seller payout's adjustment_amount and net_payout_amount to
 * reflect manual corrections or dispute resolutions.
 *
 * This test validates that administrators can modify payout financial amounts
 * when corrections are needed due to late-arriving data or special
 * circumstances.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to gain payout modification authority
 * 2. Create a seller payout record with initial calculated amounts
 * 3. Update the payout with adjustment_amount and recalculated net_payout_amount
 * 4. Verify all financial calculations maintain integrity
 */
export async function test_api_seller_payout_amount_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
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

  // Step 2: Create initial payout with baseline amounts
  const sellerPayoutPeriodStart = new Date();
  sellerPayoutPeriodStart.setMonth(sellerPayoutPeriodStart.getMonth() - 1);
  const sellerPayoutPeriodEnd = new Date();

  const grossAmount = 10000;
  const commissionAmount = 1500; // 15% commission
  const refundAmount = 500;
  const initialAdjustment = 0;
  const initialNetPayout =
    grossAmount - commissionAmount - refundAmount + initialAdjustment;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        payout_period_start: sellerPayoutPeriodStart.toISOString(),
        payout_period_end: sellerPayoutPeriodEnd.toISOString(),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        refund_amount: refundAmount,
        adjustment_amount: initialAdjustment,
        net_payout_amount: initialNetPayout,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        notes: "Initial payout calculation",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(createdPayout);

  // Verify initial payout creation
  TestValidator.equals(
    "initial adjustment amount",
    createdPayout.adjustment_amount,
    initialAdjustment,
  );
  TestValidator.equals(
    "initial net payout calculation",
    createdPayout.net_payout_amount,
    initialNetPayout,
  );

  // Step 3: Update payout with adjustment
  const adjustmentAmount = 200; // Promotional credit
  const updatedNetPayout =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;
  const adjustmentNotes =
    "Promotional credit awarded for seller performance excellence - Q4 2024 bonus program";

  const updatedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.update(connection, {
      payoutId: createdPayout.id,
      body: {
        adjustment_amount: adjustmentAmount,
        net_payout_amount: updatedNetPayout,
        notes: adjustmentNotes,
        status: "processing",
      } satisfies IShoppingMallSellerPayout.IUpdate,
    });
  typia.assert(updatedPayout);

  // Step 4: Validate adjustment results
  TestValidator.equals(
    "adjustment amount updated",
    updatedPayout.adjustment_amount,
    adjustmentAmount,
  );

  TestValidator.equals(
    "net payout recalculated correctly",
    updatedPayout.net_payout_amount,
    updatedNetPayout,
  );

  TestValidator.equals(
    "adjustment notes documented",
    updatedPayout.notes,
    adjustmentNotes,
  );

  TestValidator.equals(
    "payout status updated",
    updatedPayout.status,
    "processing",
  );

  // Verify financial calculation integrity
  const expectedNet =
    updatedPayout.gross_amount -
    updatedPayout.commission_amount -
    updatedPayout.refund_amount +
    updatedPayout.adjustment_amount;
  TestValidator.equals(
    "financial calculation integrity maintained",
    updatedPayout.net_payout_amount,
    expectedNet,
  );

  // Verify payout ID unchanged
  TestValidator.equals(
    "payout ID unchanged after update",
    updatedPayout.id,
    createdPayout.id,
  );
}
