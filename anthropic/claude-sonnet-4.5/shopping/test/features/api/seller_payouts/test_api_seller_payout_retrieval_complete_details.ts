import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test retrieving a complete seller payout record by its unique identifier.
 *
 * This test validates that administrators can access full payout details
 * including all financial breakdowns, processing status, timestamps, banking
 * information, and seller references. It ensures the core read operation works
 * correctly for payout audit and reconciliation workflows.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as administrator
 * 2. Create a comprehensive seller payout record with all financial details
 * 3. Retrieve the payout by ID
 * 4. Validate all fields match the created record exactly
 * 5. Verify required and optional fields are correctly populated
 */
export async function test_api_seller_payout_retrieval_complete_details(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: RandomGenerator.pick([
      "super_admin",
      "moderator",
      "support",
    ] as const),
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateData,
  });
  typia.assert(admin);

  // Step 2: Create a comprehensive seller payout record with all financial details
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const initiatedTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const completedTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);

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
    number & tags.Minimum<-1000> & tags.Maximum<1000>
  >() satisfies number as number;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payoutCreateData = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: netPayoutAmount,
    currency: "USD",
    status: "completed",
    bank_account_last_four: RandomGenerator.alphaNumeric(4),
    bank_name: RandomGenerator.name(2),
    transfer_reference: `TXN-${RandomGenerator.alphaNumeric(12)}`,
    failure_reason: null,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
    initiated_at: initiatedTime.toISOString(),
    completed_at: completedTime.toISOString(),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutCreateData,
    });
  typia.assert(createdPayout);

  // Step 3: Retrieve the payout by its unique ID
  const retrievedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.at(connection, {
      payoutId: createdPayout.id,
    });
  typia.assert(retrievedPayout);

  // Step 4: Validate that the retrieved payout matches the created record exactly
  TestValidator.equals(
    "payout ID matches",
    retrievedPayout.id,
    createdPayout.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedPayout.shopping_mall_seller_id,
    createdPayout.shopping_mall_seller_id,
  );

  // Step 5: Verify all required financial fields are correctly populated
  TestValidator.equals(
    "payout period start matches",
    retrievedPayout.payout_period_start,
    createdPayout.payout_period_start,
  );
  TestValidator.equals(
    "payout period end matches",
    retrievedPayout.payout_period_end,
    createdPayout.payout_period_end,
  );
  TestValidator.equals(
    "gross amount matches",
    retrievedPayout.gross_amount,
    createdPayout.gross_amount,
  );
  TestValidator.equals(
    "commission amount matches",
    retrievedPayout.commission_amount,
    createdPayout.commission_amount,
  );
  TestValidator.equals(
    "refund amount matches",
    retrievedPayout.refund_amount,
    createdPayout.refund_amount,
  );
  TestValidator.equals(
    "adjustment amount matches",
    retrievedPayout.adjustment_amount,
    createdPayout.adjustment_amount,
  );
  TestValidator.equals(
    "net payout amount matches",
    retrievedPayout.net_payout_amount,
    createdPayout.net_payout_amount,
  );
  TestValidator.equals(
    "currency matches",
    retrievedPayout.currency,
    createdPayout.currency,
  );
  TestValidator.equals(
    "status matches",
    retrievedPayout.status,
    createdPayout.status,
  );

  // Step 6: Verify optional banking details are included when present
  TestValidator.equals(
    "bank account last four matches",
    retrievedPayout.bank_account_last_four,
    createdPayout.bank_account_last_four,
  );
  TestValidator.equals(
    "bank name matches",
    retrievedPayout.bank_name,
    createdPayout.bank_name,
  );
  TestValidator.equals(
    "transfer reference matches",
    retrievedPayout.transfer_reference,
    createdPayout.transfer_reference,
  );
  TestValidator.equals(
    "notes match",
    retrievedPayout.notes,
    createdPayout.notes,
  );
  TestValidator.equals(
    "initiated_at matches",
    retrievedPayout.initiated_at,
    createdPayout.initiated_at,
  );
  TestValidator.equals(
    "completed_at matches",
    retrievedPayout.completed_at,
    createdPayout.completed_at,
  );

  // Step 7: Verify seller reference information is correctly embedded
  typia.assert(retrievedPayout.seller);
  TestValidator.equals(
    "seller reference ID matches",
    retrievedPayout.seller.id,
    retrievedPayout.shopping_mall_seller_id,
  );

  // Verify timestamp fields exist
  typia.assert(retrievedPayout.created_at);
}
