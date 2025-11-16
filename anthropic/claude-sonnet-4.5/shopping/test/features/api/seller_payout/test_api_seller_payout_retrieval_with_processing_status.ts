import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test payout retrieval with different processing statuses and status-specific
 * fields.
 *
 * This test validates that the payout retrieval endpoint correctly returns
 * payouts with their current processing status and associated status-specific
 * metadata.
 *
 * Test flow:
 *
 * 1. Create seller account for payout ownership
 * 2. Create admin account for payout management
 * 3. Create payouts in different statuses (pending, processing, completed, failed)
 * 4. Retrieve each payout as seller and verify status-specific fields
 * 5. Validate that initiated_at exists for processing status
 * 6. Validate that completed_at exists for completed status
 * 7. Validate that failure_reason exists for failed status
 */
export async function test_api_seller_payout_retrieval_with_processing_status(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account for payout creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create payout with pending status
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date();

  const pendingPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: periodEnd.toISOString(),
        gross_amount: 10000,
        commission_amount: 1000,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 9000,
        currency: "USD",
        status: "pending",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(pendingPayout);

  // Step 4: Create payout with processing status
  const processingPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: periodEnd.toISOString(),
        gross_amount: 5000,
        commission_amount: 500,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 4500,
        currency: "USD",
        status: "processing",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        initiated_at: new Date().toISOString(),
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(processingPayout);

  // Step 5: Create payout with completed status
  const completedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: periodEnd.toISOString(),
        gross_amount: 8000,
        commission_amount: 800,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 7200,
        currency: "USD",
        status: "completed",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        transfer_reference: "TXN-" + RandomGenerator.alphaNumeric(10),
        initiated_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        completed_at: new Date().toISOString(),
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(completedPayout);

  // Step 6: Create payout with failed status
  const failedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: periodStart.toISOString(),
        payout_period_end: periodEnd.toISOString(),
        gross_amount: 3000,
        commission_amount: 300,
        refund_amount: 0,
        adjustment_amount: 0,
        net_payout_amount: 2700,
        currency: "USD",
        status: "failed",
        bank_account_last_four: "1234",
        bank_name: "Test Bank",
        failure_reason: "invalid_account",
        initiated_at: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IShoppingMallSellerPayout.ICreate,
    });
  typia.assert(failedPayout);

  // Step 7: Switch to seller account to retrieve payouts
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 8: Retrieve and validate pending payout
  const retrievedPending =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: pendingPayout.id,
    });
  typia.assert(retrievedPending);
  TestValidator.equals(
    "pending payout ID matches",
    retrievedPending.id,
    pendingPayout.id,
  );
  TestValidator.equals(
    "pending payout status",
    retrievedPending.status,
    "pending",
  );
  TestValidator.predicate(
    "pending payout has no initiated_at",
    retrievedPending.initiated_at === null ||
      retrievedPending.initiated_at === undefined,
  );
  TestValidator.predicate(
    "pending payout has no completed_at",
    retrievedPending.completed_at === null ||
      retrievedPending.completed_at === undefined,
  );

  // Step 9: Retrieve and validate processing payout
  const retrievedProcessing =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: processingPayout.id,
    });
  typia.assert(retrievedProcessing);
  TestValidator.equals(
    "processing payout ID matches",
    retrievedProcessing.id,
    processingPayout.id,
  );
  TestValidator.equals(
    "processing payout status",
    retrievedProcessing.status,
    "processing",
  );
  TestValidator.predicate(
    "processing payout has initiated_at",
    retrievedProcessing.initiated_at !== null &&
      retrievedProcessing.initiated_at !== undefined,
  );
  TestValidator.predicate(
    "processing payout has no completed_at",
    retrievedProcessing.completed_at === null ||
      retrievedProcessing.completed_at === undefined,
  );

  // Step 10: Retrieve and validate completed payout
  const retrievedCompleted =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: completedPayout.id,
    });
  typia.assert(retrievedCompleted);
  TestValidator.equals(
    "completed payout ID matches",
    retrievedCompleted.id,
    completedPayout.id,
  );
  TestValidator.equals(
    "completed payout status",
    retrievedCompleted.status,
    "completed",
  );
  TestValidator.predicate(
    "completed payout has initiated_at",
    retrievedCompleted.initiated_at !== null &&
      retrievedCompleted.initiated_at !== undefined,
  );
  TestValidator.predicate(
    "completed payout has completed_at",
    retrievedCompleted.completed_at !== null &&
      retrievedCompleted.completed_at !== undefined,
  );

  // Step 11: Retrieve and validate failed payout
  const retrievedFailed =
    await api.functional.shoppingMall.seller.sellerPayouts.at(connection, {
      payoutId: failedPayout.id,
    });
  typia.assert(retrievedFailed);
  TestValidator.equals(
    "failed payout ID matches",
    retrievedFailed.id,
    failedPayout.id,
  );
  TestValidator.equals(
    "failed payout status",
    retrievedFailed.status,
    "failed",
  );
  TestValidator.predicate(
    "failed payout has initiated_at",
    retrievedFailed.initiated_at !== null &&
      retrievedFailed.initiated_at !== undefined,
  );
  TestValidator.predicate(
    "failed payout has failure_reason",
    retrievedFailed.failure_reason !== null &&
      retrievedFailed.failure_reason !== undefined,
  );
  TestValidator.equals(
    "failed payout failure reason",
    retrievedFailed.failure_reason,
    "invalid_account",
  );
}
