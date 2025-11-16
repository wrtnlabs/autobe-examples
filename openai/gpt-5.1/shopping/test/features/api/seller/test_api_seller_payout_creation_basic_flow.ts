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
 * Validate basic seller payout batch creation by a platform administrator.
 *
 * ## Business context
 *
 * Platform administrators periodically create payout batches that summarize
 * earnings owed to individual sellers. This test covers the simplest happy path
 * where a platform admin creates a single payout batch with a minimal,
 * internally consistent payload, and the system responds with a fully populated
 * IShoppingMallSellerPayout object.
 *
 * ## High-level flow
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join, relying on the
 *    SDK to attach the access token to the shared connection object.
 * 2. Create a guest cart using POST /shoppingMall/guestCarts to simulate that
 *    there has been some guest shopping activity in the mall, which is
 *    conceptually upstream of seller earnings (even though the payout API does
 *    not directly depend on this cart instance).
 * 3. Using the authenticated platform admin connection, call POST
 *    /shoppingMall/platformAdmin/sellerPayouts with a minimal but valid
 *    IShoppingMallSellerPayout.ICreate payload:
 *
 *    - Seller_id: random UUID (treated as an existing fixture seller in the test
 *         environment; we do not verify existence here).
 *    - Currency_code: a supported code such as "USD".
 *    - Gross_amount: positive numeric value.
 *    - Fee_amount and adjustment_amount: omitted to represent a simple payout where
 *         net_amount equals gross_amount.
 *    - Net_amount: same value as gross_amount.
 *    - Period_start and period_end: future or recent ISO timestamps to form a clear
 *         settlement window.
 *    - Payout_status: explicitly set to a plausible initial value such as
 *         "payout_pending".
 *    - Scheduled_payout_at: future ISO 8601 timestamp.
 *    - Memo: short free‑form comment.
 * 4. Assert that the response conforms to IShoppingMallSellerPayout using
 *    typia.assert and perform focused business checks:
 *
 *    - Id is non-empty.
 *    - SellerId matches the requested seller_id.
 *    - Currency equals the requested currency_code.
 *    - GrossAmount and netAmount equal the requested values.
 *    - NetAmount is non-negative and equals gross_amount minus fee_amount plus
 *         adjustment_amount (which degenerate to gross_amount in this simple
 *         case).
 *    - PayoutStatus is non-empty and equals the requested payout_status.
 *    - CreatedAt and updatedAt are present and parseable as dates.
 *
 * ## Out of scope for this basic flow
 *
 * - Negative error scenarios, such as non-existent seller_id, invalid currency
 *   codes, or inconsistent net_amount calculations.
 * - Any interaction with connection.headers; authentication is fully delegated to
 *   the SDK.
 * - Type error tests (sending wrong shapes or missing required fields).
 */
export async function test_api_seller_payout_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain an authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart to simulate upstream buyer activity
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.alphaNumeric(8),
    user_agent: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    referrer: "https://shop.example.com/campaign",
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  TestValidator.predicate(
    "guest cart id should be a non-empty UUID",
    (guestCart.id as string).length > 0,
  );

  // 3. Create a basic seller payout batch as platform admin
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const grossAmount = 1000;
  const netAmount = grossAmount;

  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const periodStart = new Date(now.getTime() - oneDayMs).toISOString();
  const periodEnd = now.toISOString();
  const scheduledPayoutAt = new Date(now.getTime() + oneDayMs).toISOString();

  const payoutStatus = "payout_pending";

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: "USD",
    gross_amount: grossAmount,
    net_amount: netAmount,
    scheduled_payout_at: scheduledPayoutAt,
    period_start: periodStart,
    period_end: periodEnd,
    payout_status: payoutStatus,
    memo: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(payout);

  // 4. Business-level assertions on the payout response
  TestValidator.predicate(
    "payout id should be non-empty",
    payout.id.length > 0,
  );

  TestValidator.equals(
    "sellerId in response should match requested seller_id",
    payout.sellerId,
    sellerId,
  );

  TestValidator.equals(
    "currency in response should match requested currency_code",
    payout.currency,
    payoutCreateBody.currency_code,
  );

  TestValidator.equals(
    "grossAmount should equal requested gross_amount",
    payout.grossAmount,
    payoutCreateBody.gross_amount,
  );

  TestValidator.equals(
    "netAmount should equal requested net_amount",
    payout.netAmount,
    payoutCreateBody.net_amount,
  );

  TestValidator.predicate(
    "netAmount should be non-negative",
    payout.netAmount >= 0,
  );

  const feeAmount = payout.feeAmount ?? 0;
  const adjustmentAmount = payout.adjustmentAmount ?? 0;

  TestValidator.equals(
    "netAmount should equal grossAmount - feeAmount + adjustmentAmount",
    payout.netAmount,
    payout.grossAmount - feeAmount + adjustmentAmount,
  );

  TestValidator.predicate(
    "payoutStatus should be non-empty",
    payout.payoutStatus.length > 0,
  );

  TestValidator.equals(
    "payoutStatus should equal requested payout_status when provided",
    payout.payoutStatus,
    payoutCreateBody.payout_status,
  );

  TestValidator.predicate(
    "createdAt should be a non-empty ISO date-time string",
    payout.createdAt.length > 0,
  );

  TestValidator.predicate(
    "updatedAt should be a non-empty ISO date-time string",
    payout.updatedAt.length > 0,
  );
}
