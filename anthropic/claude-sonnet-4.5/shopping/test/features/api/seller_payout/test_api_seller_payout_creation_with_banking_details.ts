import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Test creating a seller payout with complete banking information.
 *
 * This test validates that the platform properly captures and stores detailed
 * banking information when creating seller payouts. The test creates an admin
 * account and then creates a payout record with complete banking details
 * including bank name, account last four digits, and transfer reference
 * number.
 *
 * Steps:
 *
 * 1. Create and authenticate as platform administrator
 * 2. Create a payout with complete banking information
 * 3. Validate all banking fields are properly stored
 * 4. Verify bank_account_last_four contains exactly 4 characters
 * 5. Confirm banking details are available for reconciliation
 */
export async function test_api_seller_payout_creation_with_banking_details(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
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

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create payout with complete banking information
  // Note: We use a generated seller_id since seller creation endpoint is not available in test materials
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const payoutPeriodStart = new Date();
  const payoutPeriodEnd = new Date(
    payoutPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const grossAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const commissionAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
  >();
  const refundAmount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5000>
  >();
  const adjustmentAmount = 0;
  const netPayoutAmount =
    grossAmount - commissionAmount - refundAmount + adjustmentAmount;

  // Generate exactly 4 digits for bank account last four
  const bankAccountLastFour = typia
    .random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
    >()
    .toString();

  const bankNames = [
    "Chase Bank",
    "Bank of America",
    "Wells Fargo",
    "Citibank",
  ] as const;
  const selectedBankName = RandomGenerator.pick(bankNames);

  const payoutData = {
    shopping_mall_seller_id: sellerId,
    payout_period_start: payoutPeriodStart.toISOString(),
    payout_period_end: payoutPeriodEnd.toISOString(),
    gross_amount: grossAmount,
    commission_amount: commissionAmount,
    refund_amount: refundAmount,
    adjustment_amount: adjustmentAmount,
    net_payout_amount: netPayoutAmount,
    currency: "USD",
    status: "pending",
    bank_account_last_four: bankAccountLastFour,
    bank_name: selectedBankName,
    transfer_reference: `TXN-${RandomGenerator.alphaNumeric(12).toUpperCase()}`,
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payout = await api.functional.shoppingMall.admin.sellerPayouts.create(
    connection,
    {
      body: payoutData,
    },
  );
  typia.assert(payout);

  // Step 3: Validate banking information is properly stored
  TestValidator.equals(
    "bank account last four matches",
    payout.bank_account_last_four,
    bankAccountLastFour,
  );
  TestValidator.equals("bank name matches", payout.bank_name, selectedBankName);
  TestValidator.equals(
    "transfer reference matches",
    payout.transfer_reference,
    payoutData.transfer_reference,
  );

  // Step 4: Verify bank_account_last_four contains exactly 4 characters
  if (payout.bank_account_last_four) {
    TestValidator.predicate(
      "bank account last four is exactly 4 characters",
      payout.bank_account_last_four.length === 4,
    );
  }

  // Step 5: Confirm all banking details are present for reconciliation
  TestValidator.predicate(
    "banking details are complete for audit",
    payout.bank_account_last_four !== null &&
      payout.bank_account_last_four !== undefined &&
      payout.bank_name !== null &&
      payout.bank_name !== undefined &&
      payout.transfer_reference !== null &&
      payout.transfer_reference !== undefined,
  );

  // Validate payout amounts are correct
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
    "refund amount matches",
    payout.refund_amount,
    refundAmount,
  );
  TestValidator.equals(
    "net payout amount matches",
    payout.net_payout_amount,
    netPayoutAmount,
  );
  TestValidator.equals("status is pending", payout.status, "pending");
}
