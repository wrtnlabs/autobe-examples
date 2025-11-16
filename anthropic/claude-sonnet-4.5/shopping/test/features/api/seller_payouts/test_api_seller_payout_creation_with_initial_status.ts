import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test that payout creation allows setting the initial processing status and
 * properly initializes status-dependent fields.
 *
 * This test creates payouts with different initial status values (pending,
 * processing) and validates:
 *
 * 1. The status field is correctly stored in the created payout
 * 2. Status-specific timestamps are handled appropriately (null for pending, set
 *    for processing)
 * 3. The payout lifecycle tracking begins with the specified status
 * 4. Valid enum values are accepted for the status field
 *
 * Workflow:
 *
 * 1. Authenticate as admin to gain payout creation privileges
 * 2. Create a seller account to use as the payout recipient
 * 3. Create a payout with "pending" status and verify initiated_at is
 *    null/undefined
 * 4. Create a payout with "processing" status and verify initiated_at is set
 * 5. Validate all status-dependent field initialization
 */
export async function test_api_seller_payout_creation_with_initial_status(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
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

  // Step 2: Create a seller account for the payout
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = {
    email: sellerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.name(2),
    business_description: RandomGenerator.content({ paragraphs: 1 }),
    store_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Step 3: Create payout with "pending" status
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = now;

  const grossAmount = 10000;
  const commissionAmount = 1000;
  const refundAmount = 200;
  const adjustmentAmount = 0;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const pendingPayoutData = {
    shopping_mall_seller_id: seller.id,
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
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

  const pendingPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: pendingPayoutData,
    });
  typia.assert(pendingPayout);

  // Verify pending payout status and timestamps
  TestValidator.equals(
    "pending payout status",
    pendingPayout.status,
    "pending",
  );
  TestValidator.predicate(
    "pending payout has no initiated_at",
    pendingPayout.initiated_at === null ||
      pendingPayout.initiated_at === undefined,
  );
  TestValidator.predicate(
    "pending payout has no completed_at",
    pendingPayout.completed_at === null ||
      pendingPayout.completed_at === undefined,
  );
  TestValidator.equals(
    "pending payout seller ID",
    pendingPayout.shopping_mall_seller_id,
    seller.id,
  );

  // Step 4: Create payout with "processing" status
  const processingInitiatedAt = new Date();
  const processingPayoutData = {
    shopping_mall_seller_id: seller.id,
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
    gross_amount: grossAmount * 2,
    commission_amount: commissionAmount * 2,
    refund_amount: refundAmount * 2,
    adjustment_amount: adjustmentAmount,
    net_payout_amount:
      (grossAmount - commissionAmount - refundAmount + adjustmentAmount) * 2,
    currency: "USD",
    status: "processing",
    bank_account_last_four: "5678",
    bank_name: "Processing Bank",
    initiated_at: processingInitiatedAt.toISOString(),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const processingPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: processingPayoutData,
    });
  typia.assert(processingPayout);

  // Verify processing payout status and timestamps
  TestValidator.equals(
    "processing payout status",
    processingPayout.status,
    "processing",
  );
  TestValidator.predicate(
    "processing payout has initiated_at set",
    processingPayout.initiated_at !== null &&
      processingPayout.initiated_at !== undefined,
  );
  TestValidator.predicate(
    "processing payout has no completed_at",
    processingPayout.completed_at === null ||
      processingPayout.completed_at === undefined,
  );
  TestValidator.equals(
    "processing payout seller ID",
    processingPayout.shopping_mall_seller_id,
    seller.id,
  );

  // Verify financial calculations for both payouts
  TestValidator.equals(
    "pending payout net amount",
    pendingPayout.net_payout_amount,
    netPayoutAmount,
  );
  TestValidator.equals(
    "processing payout net amount",
    processingPayout.net_payout_amount,
    netPayoutAmount * 2,
  );
}
