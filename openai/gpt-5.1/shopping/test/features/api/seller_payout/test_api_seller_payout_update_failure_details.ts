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
 * Verify updating seller payout batches with failure details as a platform
 * admin.
 *
 * Business purpose: Platform admins need to reconcile payouts that have failed
 * at the payment provider or banking layer. When a payout fails, admins (or
 * integration workers) must be able to:
 *
 * - Mark the payout as failed via `payout_status`.
 * - Attach structured failure reason metadata (`failure_reason_code`,
 *   `failure_reason_message`).
 * - Optionally enrich provider metadata (`provider_name`, `provider_payout_id`).
 * - Later refine human-readable failure messages without altering the
 *   machine-oriented failure code.
 *
 * This test exercises the happy path of such a failure update while ensuring
 * that core identity and monetary fields remain stable.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin using /auth/platformAdmin/join.
 * 2. Create a guest cart as contextual upstream commerce data via
 *    /shoppingMall/guestCarts.
 * 3. Create an initial seller payout in a non-failed state via
 *    /shoppingMall/platformAdmin/sellerPayouts.
 * 4. Update the payout to a failed state with failure code and message via PUT
 *    /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId}.
 * 5. Assert response reflects failure state and attached failure details while
 *    preserving core monetary and identity fields.
 * 6. Perform a follow-up update that changes only the failure message while
 *    keeping the failure code and status.
 * 7. Assert that the refined message is persisted and code/status remain
 *    consistent.
 */
export async function test_api_seller_payout_update_failure_details(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also establishes authenticated session)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.mobile(),
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart as upstream commerce context
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shoppingmall.example.com/product/123",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create an initial seller payout in a non-failed state
  // We don't have a seller creation API in this context, so we rely on a
  // random UUID for seller_id that satisfies type requirements.
  const payoutCreateBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    currency_code: "KRW",
    gross_amount: 100_000,
    fee_amount: 5_000,
    adjustment_amount: 0,
    net_amount: 95_000,
    period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    memo: "Initial pending payout for seller in weekly cycle",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(createdPayout);

  // Capture baseline properties for later comparison
  const originalPayoutId: string = createdPayout.id;
  const originalSellerId: string = createdPayout.sellerId;
  const originalCurrency: string = createdPayout.currency;
  const originalNetAmount: number = createdPayout.netAmount;

  // 4. Update payout to a failed state with failure reason details
  const failureStatus = "payout_failed";
  const failureReasonCode = "BANK_REJECTED";
  const failureReasonMessage =
    "Bank rejected payout due to invalid beneficiary account number";
  const providerName = "MockBank";
  const providerPayoutId = `MBK-${RandomGenerator.alphaNumeric(10)}`;

  const failureUpdateBody = {
    payout_status: failureStatus,
    failure_reason_code: failureReasonCode,
    failure_reason_message: failureReasonMessage,
    provider_name: providerName,
    provider_payout_id: providerPayoutId,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const failedPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.update(
      connection,
      {
        sellerPayoutId: originalPayoutId as string & tags.Format<"uuid">,
        body: failureUpdateBody,
      },
    );
  typia.assert(failedPayout);

  // 5. Assert failure state and core field stability
  TestValidator.equals(
    "payout id should remain unchanged after failure update",
    failedPayout.id,
    originalPayoutId,
  );
  TestValidator.equals(
    "seller id should remain unchanged after failure update",
    failedPayout.sellerId,
    originalSellerId,
  );
  TestValidator.equals(
    "currency should remain unchanged after failure update",
    failedPayout.currency,
    originalCurrency,
  );
  TestValidator.equals(
    "net amount should remain unchanged after failure update",
    failedPayout.netAmount,
    originalNetAmount,
  );
  TestValidator.equals(
    "payout status should reflect failed state",
    failedPayout.payoutStatus,
    failureStatus,
  );
  TestValidator.equals(
    "failure reason code should match update payload",
    failedPayout.failureReasonCode ?? null,
    failureReasonCode,
  );
  TestValidator.equals(
    "failure reason message should match update payload",
    failedPayout.failureReasonMessage ?? null,
    failureReasonMessage,
  );

  // 6. Follow-up update: refine failure_reason_message while preserving code
  const refinedFailureMessage = `${failureReasonMessage} - beneficiary account closed.`;
  const refineUpdateBody = {
    failure_reason_message: refinedFailureMessage,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const refinedPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.update(
      connection,
      {
        sellerPayoutId: originalPayoutId as string & tags.Format<"uuid">,
        body: refineUpdateBody,
      },
    );
  typia.assert(refinedPayout);

  TestValidator.equals(
    "payout status should remain failed after refining message",
    refinedPayout.payoutStatus,
    failureStatus,
  );
  TestValidator.equals(
    "failure reason code should remain unchanged after refining message",
    refinedPayout.failureReasonCode ?? null,
    failureReasonCode,
  );
  TestValidator.equals(
    "failure reason message should be updated to refined value",
    refinedPayout.failureReasonMessage ?? null,
    refinedFailureMessage,
  );
}
