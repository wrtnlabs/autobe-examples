import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test retrieving a seller payout and verify the accuracy of all financial
 * calculations and breakdowns.
 *
 * This test validates that the retrieved payout correctly shows the
 * relationship between gross_amount, commission_amount, refund_amount,
 * adjustment_amount, and net_payout_amount. The test verifies the calculation
 * formula (gross - commission - refund + adjustment = net) is accurately
 * reflected in the stored data, that all amounts use the correct currency, and
 * that the financial breakdown provides complete transparency for accounting
 * and reconciliation.
 *
 * Test Steps:
 *
 * 1. Authenticate as administrator to gain authorization for payout operations
 * 2. Create a seller payout with complete financial breakdown
 * 3. Retrieve the payout using the GET endpoint
 * 4. Validate all financial calculations and data integrity
 * 5. Verify the mathematical formula: net = gross - commission - refund +
 *    adjustment
 */
export async function test_api_seller_payout_retrieval_financial_calculations(
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

  // Step 2: Create a seller payout with complete financial breakdown
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const grossAmount = 50000;
  const commissionAmount = 5000;
  const refundAmount = 2000;
  const adjustmentAmount = 500;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const transferReference = RandomGenerator.alphaNumeric(15).toUpperCase();

  const payoutData = {
    shopping_mall_seller_id: sellerId,
    payout_period_start: periodStart.toISOString(),
    payout_period_end: periodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: netPayoutAmount,
    currency: "USD",
    status: "completed",
    bank_account_last_four: "1234",
    bank_name: "First National Bank",
    transfer_reference: transferReference,
    notes: "Regular monthly payout with adjustment for promotional credit",
    initiated_at: new Date(
      now.getTime() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    completed_at: now.toISOString(),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutData,
    });
  typia.assert(createdPayout);

  // Step 3: Retrieve the payout using the GET endpoint
  const retrievedPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.at(connection, {
      payoutId: createdPayout.id,
    });
  typia.assert(retrievedPayout);

  // Step 4: Validate all financial calculations and data integrity
  TestValidator.equals(
    "payout ID matches",
    retrievedPayout.id,
    createdPayout.id,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedPayout.shopping_mall_seller_id,
    sellerId,
  );

  // Validate financial amounts
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

  // Step 5: Verify the mathematical formula: net = gross - commission - refund + adjustment
  const calculatedNet =
    retrievedPayout.gross_amount -
    retrievedPayout.commission_amount -
    retrievedPayout.refund_amount +
    retrievedPayout.adjustment_amount;
  TestValidator.equals(
    "financial calculation formula is accurate",
    retrievedPayout.net_payout_amount,
    calculatedNet,
  );

  // Validate currency consistency
  TestValidator.equals("currency is correct", retrievedPayout.currency, "USD");

  // Validate payout period
  TestValidator.equals(
    "payout period start matches",
    retrievedPayout.payout_period_start,
    periodStart.toISOString(),
  );
  TestValidator.equals(
    "payout period end matches",
    retrievedPayout.payout_period_end,
    periodEnd.toISOString(),
  );

  // Validate payout status and metadata
  TestValidator.equals(
    "payout status matches",
    retrievedPayout.status,
    "completed",
  );
  TestValidator.equals(
    "bank account last four matches",
    retrievedPayout.bank_account_last_four,
    "1234",
  );
  TestValidator.equals(
    "bank name matches",
    retrievedPayout.bank_name,
    "First National Bank",
  );
  TestValidator.equals(
    "transfer reference matches",
    retrievedPayout.transfer_reference,
    transferReference,
  );
  TestValidator.equals("notes match", retrievedPayout.notes, payoutData.notes);

  // Validate seller summary is present
  TestValidator.predicate(
    "seller summary exists in payout",
    retrievedPayout.seller !== undefined && retrievedPayout.seller !== null,
  );

  // Validate that the financial breakdown provides complete transparency
  TestValidator.predicate(
    "all financial components are present",
    retrievedPayout.gross_amount !== undefined &&
      retrievedPayout.commission_amount !== undefined &&
      retrievedPayout.refund_amount !== undefined &&
      retrievedPayout.adjustment_amount !== undefined &&
      retrievedPayout.net_payout_amount !== undefined,
  );
}
