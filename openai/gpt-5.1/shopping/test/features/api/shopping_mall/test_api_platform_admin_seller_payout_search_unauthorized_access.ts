import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Verify that seller payout search endpoint rejects unauthenticated access.
 *
 * Business goal
 *
 * - Ensure that PATCH /shoppingMall/platformAdmin/sellerPayouts cannot be used
 *   without a valid platform admin Authorization context.
 * - Confirm that even with valid search parameters and existing payout data,
 *   unauthenticated callers receive an HTTP error.
 *
 * Flow
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join.
 * 2. Optionally create a guest cart using POST /shoppingMall/guestCarts
 *    (precondition realism only).
 * 3. Create at least one seller payout batch using POST
 *    /shoppingMall/platformAdmin/sellerPayouts.
 * 4. Build an unauthenticated connection by cloning the original connection and
 *    resetting headers to an empty object.
 * 5. Call PATCH /shoppingMall/platformAdmin/sellerPayouts with a valid
 *    IShoppingMallSellerPayout.IRequest body using the unauthenticated
 *    connection and assert that an HTTP 401 or 403 style error is thrown.
 */
export async function test_api_platform_admin_seller_payout_search_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth setup on main connection)
  const joinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Optional guest cart creation to mirror upstream guest activity
  const guestCartCreateBody = typia.random<IShoppingMallGuestCart.ICreate>();
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 3. Create a seller payout batch using the authenticated connection
  const payoutCreateBody = typia.random<IShoppingMallSellerPayout.ICreate>();
  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(payout);

  // 4. Build an unauthenticated connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5. Attempt to search seller payouts without authentication using
  //    a valid search request body
  const searchBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSellerPayout.IRequest;

  await TestValidator.httpError(
    "unauthenticated seller payout search should fail",
    [401, 403],
    async () => {
      return await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
        unauthConn,
        {
          body: searchBody,
        },
      );
    },
  );
}
