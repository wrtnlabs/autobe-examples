import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test administrator payout creation workflow for seller earnings settlement.
 *
 * This test validates the complete flow of creating seller payout transactions
 * by administrators. It ensures that:
 *
 * 1. Admin authentication is properly established
 * 2. Seller account exists for payout association
 * 3. Payout creation with complete financial information succeeds
 * 4. All financial fields are correctly stored and returned
 * 5. Financial calculation validation (gross - commission - refunds + adjustments
 *    = net)
 * 6. Created payout has proper seller reference
 * 7. All timestamps and metadata are properly initialized
 */
export async function test_api_seller_payout_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  // Step 2: Create a seller account for payout association
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerCreateBody = {
    email: sellerEmail,
    password: sellerPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Step 3: Re-authenticate as admin (seller join may have changed auth context)
  const adminReauth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminReauth);

  // Step 4: Prepare payout financial data with valid calculation
  const grossAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<50000>
  >();
  const commissionAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<5000>
  >();
  const refundAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
  >();
  const adjustmentAmount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-500> & tags.Maximum<500>
  >();
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  // Step 5: Create payout period dates
  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const periodEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

  // Step 6: Create payout transaction
  const payoutCreateBody = {
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
    transfer_reference: null,
    failure_reason: null,
    initiated_at: null,
    completed_at: null,
    notes: "Test payout creation by admin",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.admin.sellerPayouts.create(connection, {
      body: payoutCreateBody,
    });
  typia.assert(createdPayout);

  // Step 7: Validate created payout data
  TestValidator.equals(
    "payout has unique ID",
    typeof createdPayout.id,
    "string",
  );
  TestValidator.equals(
    "payout seller ID matches",
    createdPayout.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "payout seller reference exists",
    createdPayout.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "payout seller email matches",
    createdPayout.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "payout period start matches",
    createdPayout.payout_period_start,
    periodStart.toISOString(),
  );
  TestValidator.equals(
    "payout period end matches",
    createdPayout.payout_period_end,
    periodEnd.toISOString(),
  );
  TestValidator.equals(
    "payout gross amount matches",
    createdPayout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "payout commission amount matches",
    createdPayout.commission_amount,
    commissionAmount,
  );
  TestValidator.equals(
    "payout refund amount matches",
    createdPayout.refund_amount,
    refundAmount,
  );
  TestValidator.equals(
    "payout adjustment amount matches",
    createdPayout.adjustment_amount,
    adjustmentAmount,
  );
  TestValidator.equals(
    "payout net amount matches",
    createdPayout.net_payout_amount,
    netPayoutAmount,
  );
  TestValidator.equals(
    "payout currency matches",
    createdPayout.currency,
    "USD",
  );
  TestValidator.equals(
    "payout status matches",
    createdPayout.status,
    "pending",
  );
  TestValidator.equals(
    "payout bank account last four matches",
    createdPayout.bank_account_last_four,
    "1234",
  );
  TestValidator.equals(
    "payout bank name matches",
    createdPayout.bank_name,
    "Test Bank",
  );
  TestValidator.equals(
    "payout notes match",
    createdPayout.notes,
    "Test payout creation by admin",
  );

  // Step 8: Validate financial calculation integrity
  const calculatedNet =
    createdPayout.gross_amount -
    createdPayout.commission_amount -
    createdPayout.refund_amount +
    createdPayout.adjustment_amount;
  TestValidator.equals(
    "financial calculation is correct",
    calculatedNet,
    createdPayout.net_payout_amount,
  );
  TestValidator.predicate(
    "net payout matches calculation",
    Math.abs(calculatedNet - netPayoutAmount) < 0.01,
  );

  // Step 9: Validate timestamps exist
  TestValidator.predicate(
    "payout has created_at timestamp",
    typeof createdPayout.created_at === "string",
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(createdPayout.created_at),
  );
}
