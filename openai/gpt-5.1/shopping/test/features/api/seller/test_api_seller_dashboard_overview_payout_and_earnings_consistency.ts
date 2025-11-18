import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerOverviewDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOverviewDashboard";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller overview dashboard payouts section for structural and
 * intra-response consistency.
 *
 * Business context: This test targets the ShoppingMall seller dashboard
 * overview endpoint `/shoppingMall/seller/dashboard/sellerOverview` and focuses
 * specifically on the payouts section. In a full environment the payouts
 * section aggregates figures from `shopping_mall_seller_earnings` and
 * `shopping_mall_seller_payout_batches` for the authenticated seller. However,
 * in this test harness we only have access to the auth join endpoint and the
 * dashboard read model itself. No order creation, earnings generation, or
 * payout APIs are exposed, so we cannot perform a true cross-table financial
 * reconciliation.
 *
 * Therefore, this E2E test validates what is feasible:
 *
 * 1. A seller can self-register via POST /auth/seller/join and receive a valid
 *    authorized seller object (IShoppingMallSeller.IAuthorized) including an
 *    authorization token bundle (IAuthorizationToken).
 * 2. Once authenticated as that seller, a call to GET
 *    /shoppingMall/seller/dashboard/sellerOverview succeeds and returns a
 *    payload conforming exactly to IShoppingMallSellerOverviewDashboard.
 * 3. The payouts section within the dashboard has internally sane values:
 *
 *    - `totalNetEarnings` is non-negative.
 *    - `pendingPayoutAmount` is non-negative and does not exceed `totalNetEarnings`
 *         (a reasonable invariant for aggregate payout summaries).
 *    - `lastPayoutAmount` is non-negative.
 *    - `lastPayoutDate` parses as a valid ISO date-time string.
 * 4. Two consecutive dashboard reads in the same session return payout aggregates
 *    that are stable enough for rapid consecutive requests, i.e., the second
 *    response’s payouts section matches the first response exactly. This gives
 *    confidence that the dashboard is deterministic for a given point in time
 *    and seller context.
 *
 * Note that we intentionally _do not_ attempt to:
 *
 * - Create orders, earnings, or payout batches (no such APIs are available to the
 *   test harness in this context).
 * - Recompute financial aggregates from underlying tables.
 * - Perform any type-error or invalid-payload testing; all requests are
 *   constructed with correct DTO types.
 */
export async function test_api_seller_dashboard_overview_payout_and_earnings_consistency(
  connection: api.IConnection,
) {
  // 1. Seller self-registration via /auth/seller/join
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/onboarding" as string &
      tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller = await api.functional.auth.seller.join(connection, {
    body: joinRequest,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);
  typia.assert<IAuthorizationToken>(authorizedSeller.token);

  // 2. Fetch seller overview dashboard for this authenticated seller
  const dashboard1 =
    await api.functional.shoppingMall.seller.dashboard.sellerOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSellerOverviewDashboard>(dashboard1);

  const payouts1 = dashboard1.payouts;

  // 3. Basic sanity checks on payouts section
  TestValidator.predicate(
    "totalNetEarnings must be non-negative",
    payouts1.totalNetEarnings >= 0,
  );
  TestValidator.predicate(
    "pendingPayoutAmount must be non-negative",
    payouts1.pendingPayoutAmount >= 0,
  );
  TestValidator.predicate(
    "lastPayoutAmount must be non-negative",
    payouts1.lastPayoutAmount >= 0,
  );

  // pendingPayoutAmount should not exceed totalNetEarnings in a sane model
  TestValidator.predicate(
    "pendingPayoutAmount must not exceed totalNetEarnings",
    payouts1.pendingPayoutAmount <= payouts1.totalNetEarnings,
  );

  // lastPayoutDate should parse as a valid date-time and not be an obviously
  // invalid timestamp (e.g., NaN).
  const lastPayoutDate1 = new Date(payouts1.lastPayoutDate);
  TestValidator.predicate(
    "lastPayoutDate must be a valid date-time",
    !Number.isNaN(lastPayoutDate1.getTime()),
  );

  // 4. Fetch dashboard again to ensure deterministic payouts section for the
  // same seller context and near-identical time.
  const dashboard2 =
    await api.functional.shoppingMall.seller.dashboard.sellerOverview.at(
      connection,
    );
  typia.assert<IShoppingMallSellerOverviewDashboard>(dashboard2);

  const payouts2 = dashboard2.payouts;

  // Validate that the payouts section did not change between the two reads.
  TestValidator.equals(
    "payouts section should be stable across consecutive reads",
    payouts2,
    payouts1,
  );
}
