import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test updating seller payout status from pending to processing.
 *
 * This test validates the workflow where platform administrators update a
 * seller payout record's status from "pending" to "processing" when initiating
 * payment transfer through the banking system. This represents a critical step
 * in the seller earnings settlement lifecycle.
 *
 * Test Flow:
 *
 * 1. Authenticate as platform administrator
 * 2. Create initial seller payout record in pending status
 * 3. Update payout status to processing with initiated_at timestamp
 * 4. Validate status transition and timestamp recording
 * 5. Verify data integrity of unchanged fields
 */
export async function test_api_seller_payout_status_update_to_processing(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as platform administrator
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

  // Step 2: Create seller payout record in pending status
  const payoutPeriodStart = new Date();
  payoutPeriodStart.setDate(payoutPeriodStart.getDate() - 30);
  const payoutPeriodEnd = new Date();
  payoutPeriodEnd.setDate(payoutPeriodEnd.getDate() - 1);

  const grossAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >() satisfies number as number;
  const commissionAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
  >() satisfies number as number;
  const refundAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5000>
  >() satisfies number as number;
  const adjustmentAmount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-1000> & tags.Maximum<1000>
  >() satisfies number as number;
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
    bank_account_last_four: "1234",
    bank_name: "Test Bank",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });
  typia.assert(createdPayout);

  // Step 3: Update payout status to processing with initiated_at timestamp
  const initiatedAt = new Date().toISOString();

  const updateData = {
    status: "processing",
    initiated_at: initiatedAt,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const updatedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.update(connection, {
      payoutId: createdPayout.id,
      body: updateData,
    });
  typia.assert(updatedPayout);

  // Step 4: Validate status transition
  TestValidator.equals(
    "payout status should be processing",
    updatedPayout.status,
    "processing",
  );

  // Step 5: Validate initiated_at timestamp was recorded
  TestValidator.equals(
    "initiated_at timestamp should be set",
    updatedPayout.initiated_at,
    initiatedAt,
  );

  // Step 6: Verify unchanged financial data
  TestValidator.equals(
    "gross amount should remain unchanged",
    updatedPayout.gross_amount,
    createdPayout.gross_amount,
  );

  TestValidator.equals(
    "commission amount should remain unchanged",
    updatedPayout.commission_amount,
    createdPayout.commission_amount,
  );

  TestValidator.equals(
    "refund amount should remain unchanged",
    updatedPayout.refund_amount,
    createdPayout.refund_amount,
  );

  TestValidator.equals(
    "adjustment amount should remain unchanged",
    updatedPayout.adjustment_amount,
    createdPayout.adjustment_amount,
  );

  TestValidator.equals(
    "net payout amount should remain unchanged",
    updatedPayout.net_payout_amount,
    createdPayout.net_payout_amount,
  );

  // Step 7: Verify unchanged payout period dates
  TestValidator.equals(
    "payout period start should remain unchanged",
    updatedPayout.payout_period_start,
    createdPayout.payout_period_start,
  );

  TestValidator.equals(
    "payout period end should remain unchanged",
    updatedPayout.payout_period_end,
    createdPayout.payout_period_end,
  );

  // Step 8: Verify seller reference remains unchanged
  TestValidator.equals(
    "seller ID should remain unchanged",
    updatedPayout.shopping_mall_seller_id,
    createdPayout.shopping_mall_seller_id,
  );
}
