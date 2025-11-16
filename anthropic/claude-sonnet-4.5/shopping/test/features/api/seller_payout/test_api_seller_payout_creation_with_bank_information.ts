import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test that payout creation can include bank transfer details for payment
 * processing and seller verification.
 *
 * This test validates that optional bank information (bank_account_last_four,
 * bank_name, transfer_reference) can be successfully included in seller payout
 * records, enabling proper payment tracking, seller verification, and
 * reconciliation in banking systems.
 *
 * Test Flow:
 *
 * 1. Authenticate as admin to gain payout creation authorization
 * 2. Create a seller account with complete business information
 * 3. Create a payout record with all optional bank transfer details populated
 * 4. Validate that bank information is correctly stored and accessible
 * 5. Verify that bank details help sellers identify destination accounts and
 *    enable payment tracking
 */
export async function test_api_seller_payout_creation_with_bank_information(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to create payout with bank details
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
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

  // Step 2: Create seller account with banking information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(12),
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

  // Step 3: Create payout with complete bank information for payment processing
  const payoutPeriodStart = new Date();
  const payoutPeriodEnd = RandomGenerator.date(
    payoutPeriodStart,
    1000 * 60 * 60 * 24 * 30,
  );

  const grossAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >() satisfies number as number;
  const commissionAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
  >() satisfies number as number;
  const refundAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000>
  >() satisfies number as number;
  const adjustmentAmount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<-500> & tags.Maximum<500>
  >() satisfies number as number;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  const payout = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        payout_period_start: payoutPeriodStart.toISOString(),
        payout_period_end: payoutPeriodEnd.toISOString(),
        gross_amount: grossAmount,
        commission_amount: commissionAmount,
        refund_amount: refundAmount,
        adjustment_amount: adjustmentAmount,
        net_payout_amount: netPayoutAmount,
        currency: "USD",
        status: "pending",
        bank_account_last_four: RandomGenerator.alphaNumeric(4),
        bank_name: RandomGenerator.name(2),
        transfer_reference: `TXN-${RandomGenerator.alphaNumeric(16).toUpperCase()}`,
      } satisfies IShoppingMallSellerPayout.ICreate,
    },
  );
  typia.assert(payout);

  // Step 4: Validate that bank information is correctly stored for payment tracking
  TestValidator.equals(
    "payout seller ID matches",
    payout.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals("payout status is pending", payout.status, "pending");
  TestValidator.equals(
    "gross amount matches",
    payout.gross_amount,
    grossAmount,
  );
  TestValidator.equals(
    "commission amount matches",
    payout.commission_amount,
    commissionAmount,
  );
  TestValidator.equals(
    "net payout amount matches",
    payout.net_payout_amount,
    netPayoutAmount,
  );

  // Step 5: Verify bank transfer details are correctly stored
  TestValidator.predicate(
    "bank account last four is stored",
    payout.bank_account_last_four !== null &&
      payout.bank_account_last_four !== undefined,
  );
  TestValidator.predicate(
    "bank name is stored",
    payout.bank_name !== null && payout.bank_name !== undefined,
  );
  TestValidator.predicate(
    "transfer reference is stored",
    payout.transfer_reference !== null &&
      payout.transfer_reference !== undefined,
  );

  // Step 6: Validate that bank details provide proper verification and tracking
  TestValidator.predicate(
    "bank account last four helps verify destination",
    typeof payout.bank_account_last_four === "string" &&
      payout.bank_account_last_four.length === 4,
  );
  TestValidator.predicate(
    "bank name identifies financial institution",
    typeof payout.bank_name === "string" && payout.bank_name.length > 0,
  );
  TestValidator.predicate(
    "transfer reference enables banking system tracking",
    typeof payout.transfer_reference === "string" &&
      payout.transfer_reference.length > 0,
  );
}
