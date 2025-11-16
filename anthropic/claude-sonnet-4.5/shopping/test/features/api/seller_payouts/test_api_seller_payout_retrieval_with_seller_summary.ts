import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test retrieving a seller payout and verify that it includes the complete
 * seller summary information.
 *
 * This scenario validates that the payout response properly includes the
 * embedded seller object with essential seller details (store name, email,
 * status, email verification). The test verifies that the seller relationship
 * is properly populated, that seller summary contains all required fields, and
 * that administrators can access seller context without making additional API
 * calls. This tests the efficiency of the API design for providing complete
 * payout context in a single request.
 *
 * Test Steps:
 *
 * 1. Authenticate as administrator to gain authorization for accessing payout
 *    records
 * 2. Create a seller payout record with seller relationship
 * 3. Retrieve the created payout by ID
 * 4. Validate that the response includes the embedded seller summary with all
 *    required fields
 * 5. Verify seller relationship integrity and payout data consistency
 */
export async function test_api_seller_payout_retrieval_with_seller_summary(
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

  // Step 2: Create a seller payout record with seller relationship
  const payoutPeriodStart = new Date();
  const payoutPeriodEnd = new Date(
    payoutPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const grossAmount = 10000;
  const commissionAmount = 1000;
  const refundAmount = 500;
  const adjustmentAmount = 0;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
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
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(createdPayout);

  // Step 3: Retrieve the created payout by ID
  const retrievedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.at(connection, {
      payoutId: createdPayout.id,
    });
  typia.assert(retrievedPayout);

  // Step 4: Validate seller summary is embedded and complete
  // typia.assert already validated that seller object exists with all required ISummary fields
  // (id, store_name, email, status, email_verified) per the IShoppingMallSellerPayout type

  // Step 5: Verify seller relationship integrity
  TestValidator.equals(
    "seller id must match shopping_mall_seller_id foreign key",
    retrievedPayout.shopping_mall_seller_id,
    retrievedPayout.seller.id,
  );

  // Verify payout ID consistency
  TestValidator.equals(
    "retrieved payout id must match created payout id",
    retrievedPayout.id,
    createdPayout.id,
  );
}
