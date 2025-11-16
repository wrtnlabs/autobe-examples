import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Validate platform-admin-driven seller payout creation with fees and
 * adjustments.
 *
 * Business focus:
 *
 * - A platform admin can create a seller payout batch using the platform-admin
 *   payouts API.
 * - The payout includes gross amount, platform fee amount, and manual adjustment
 *   amount.
 * - The net payout amount must satisfy the documented business rule `net_amount =
 *   gross_amount - fee_amount + adjustment_amount` (with optional components
 *   treated as zero).
 * - Core monetary and period fields in the response must mirror the request.
 *
 * High-level steps:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join and obtain
 *    an authenticated session (the SDK automatically sets the Authorization
 *    header on the connection).
 * 2. Create a guest cart via POST /shoppingMall/guestCarts to satisfy the scenario
 *    dependency that there is some underlying customer activity.
 * 3. As the platform admin, call POST /shoppingMall/platformAdmin/sellerPayouts
 *    with an IShoppingMallSellerPayout.ICreate payload that exercises:
 *
 *    - Currency_code
 *    - Gross_amount
 *    - Fee_amount (positive fee)
 *    - Adjustment_amount (negative manual debit)
 *    - Net_amount consistent with the business rule
 *    - Period_start / period_end bracketing a settlement window
 *    - Payout_status explicitly set (e.g., "payout_pending")
 *    - Scheduled_payout_at in the near future
 *    - Memo for descriptive context
 * 4. Assert that the response IShoppingMallSellerPayout echoes monetary and period
 *    fields from the request and that its netAmount is arithmetically
 *    consistent with grossAmount, feeAmount, and adjustmentAmount.
 */
export async function test_api_seller_payout_creation_with_fees_and_adjustments(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (authentication bootstrap)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.10",
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart to simulate underlying customer activity
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "198.51.100.42",
    user_agent: "Mozilla/5.0 (E2E Test Suite)",
    referrer: "https://shop.example.com/campaign",
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Prepare seller payout creation payload
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const grossAmount = 1000;
  const feeAmount = 150;
  const adjustmentAmount = -50;

  const computedNetAmount = grossAmount - feeAmount + adjustmentAmount;

  const now = new Date();
  const periodStartDate = RandomGenerator.date(now, 24 * 60 * 60 * 1000);
  const periodEndDate = RandomGenerator.date(
    new Date(periodStartDate.getTime() + 24 * 60 * 60 * 1000),
    24 * 60 * 60 * 1000,
  );

  const periodStartIso = periodStartDate.toISOString();
  const periodEndIso = periodEndDate.toISOString();

  const scheduledPayoutAt = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const payoutStatus = "payout_pending";

  const payoutBody = {
    seller_id: sellerId,
    currency_code: "USD",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: computedNetAmount,
    period_start: periodStartIso,
    period_end: periodEndIso,
    payout_status: payoutStatus,
    scheduled_payout_at: scheduledPayoutAt,
    memo: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  // 4. Create the seller payout batch
  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutBody,
      },
    );
  typia.assert(payout);

  // 5. Validate that response mirrors key request fields
  TestValidator.equals(
    "currency should match request currency_code",
    payout.currency,
    payoutBody.currency_code,
  );

  TestValidator.equals(
    "grossAmount should match gross_amount",
    payout.grossAmount,
    payoutBody.gross_amount,
  );

  TestValidator.equals(
    "feeAmount should match fee_amount",
    payout.feeAmount ?? null,
    payoutBody.fee_amount ?? null,
  );

  TestValidator.equals(
    "adjustmentAmount should match adjustment_amount",
    payout.adjustmentAmount ?? null,
    payoutBody.adjustment_amount ?? null,
  );

  TestValidator.equals(
    "netAmount should match net_amount",
    payout.netAmount,
    payoutBody.net_amount,
  );

  TestValidator.equals(
    "payoutStatus should match payout_status",
    payout.payoutStatus,
    payoutBody.payout_status ?? null,
  );

  TestValidator.equals(
    "periodStart should mirror period_start",
    payout.periodStart ?? null,
    payoutBody.period_start ?? null,
  );

  TestValidator.equals(
    "periodEnd should mirror period_end",
    payout.periodEnd ?? null,
    payoutBody.period_end ?? null,
  );

  // 6. Independently recompute net amount from response and validate
  const responseFee = payout.feeAmount ?? 0;
  const responseAdjustment = payout.adjustmentAmount ?? 0;
  const recomputedNet = payout.grossAmount - responseFee + responseAdjustment;

  TestValidator.equals(
    "netAmount should equal grossAmount - feeAmount + adjustmentAmount",
    payout.netAmount,
    recomputedNet,
  );
}
