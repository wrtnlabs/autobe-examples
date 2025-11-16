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
 * Ensure platform-admin payout deletion is forbidden without authentication.
 *
 * Business goal: Verify that the DELETE
 * /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId} endpoint correctly
 * enforces platform-admin authentication and rejects unauthenticated deletion
 * attempts, preventing unauthorized removal of financial payout records.
 *
 * High-level flow:
 *
 * 1. Bootstrap a new platform admin account using POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest as request body.
 *    - Rely on SDK to set Authorization header on the shared `connection`.
 * 2. While authenticated as that admin, create a guest cart via POST
 *    /shoppingMall/guestCarts to simulate minimal upstream activity.
 *
 *    - Use IShoppingMallGuestCart.ICreate as body.
 * 3. Still authenticated, create a seller payout batch via POST
 *    /shoppingMall/platformAdmin/sellerPayouts.
 *
 *    - Use IShoppingMallSellerPayout.ICreate as body.
 *    - Capture the returned IShoppingMallSellerPayout.id as `sellerPayoutId`.
 * 4. Derive an unauthenticated connection by shallow-copying the original
 *    `connection` into `unauthConn` and providing a fresh empty `headers`
 *    object.
 *
 *    - Do NOT mutate `connection.headers` (absolute prohibition).
 * 5. Attempt to delete the payout using the unauthenticated connection:
 *
 *    - Call api.functional.shoppingMall.platformAdmin.sellerPayouts.erase with
 *         `unauthConn` and the captured `sellerPayoutId`.
 * 6. Use TestValidator.httpError to assert that the erase call fails with a 401 or
 *    403 HTTP error, indicating missing/invalid authentication.
 *
 *    - Do not test for an exact single status code; pass [401, 403].
 * 7. Because no GET-by-id payout read endpoint is available in the materials, skip
 *    any persistence re-check of the payout record; rely solely on the
 *    httpError assertion to validate the negative auth behavior.
 */
export async function test_api_platform_admin_delete_seller_payout_forbidden_without_auth(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authenticated session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart as minimal upstream activity context.
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E-GuestCart)",
    referrer: "https://shop.example.com/campaign",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create a seller payout batch as the authenticated platform admin.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const now = new Date();
  const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: "KRW",
    gross_amount: 1_000_000,
    fee_amount: 50_000,
    adjustment_amount: 0,
    net_amount: 950_000,
    period_start: new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    period_end: now.toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: inOneDay.toISOString(),
    memo: "E2E test payout",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(payout);

  // Narrow payout.id to the UUID-tagged type required by erase.Props.
  const sellerPayoutId = typia.assert<string & tags.Format<"uuid">>(payout.id);

  // 4. Build an unauthenticated connection without mutating the original.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5 & 6. Attempt erase with unauthenticated connection and expect 401/403.
  await TestValidator.httpError(
    "unauthenticated erase of seller payout must be rejected",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.erase(
        unauthConn,
        {
          sellerPayoutId,
        },
      );
    },
  );
}
