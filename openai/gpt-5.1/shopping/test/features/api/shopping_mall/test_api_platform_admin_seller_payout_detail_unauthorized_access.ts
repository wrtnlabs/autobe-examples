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
 * Validate that accessing seller payout details without a valid platform admin
 * session is rejected.
 *
 * Business context: Platform administrators can review detailed information of
 * seller payout batches via GET
 * /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId}. However, this
 * endpoint must not be accessible without a valid platform admin session.
 * Unauthorized callers (no token or wrong actor) must receive an authorization
 * error and must not see payout details.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join, which also
 *    seeds an Authorization header on the shared connection.
 * 2. Create a guest cart via POST /shoppingMall/guestCarts to simulate realistic
 *    upstream shopping activity before payout creation.
 * 3. Create a seller payout batch for some seller using POST
 *    /shoppingMall/platformAdmin/sellerPayouts and capture its id.
 * 4. Construct a new unauthenticated connection object with empty headers so it
 *    carries no admin token at all.
 * 5. Call GET /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId} using the
 *    unauthenticated connection and expect the SDK to throw an HttpError,
 *    proving that unauthorized access is rejected.
 *
 * Notes:
 *
 * - We do not assert specific HTTP status codes or error body shapes, only that
 *   an error occurs.
 * - We never manipulate `connection.headers` directly; instead we clone the
 *   connection into a new object with `headers: {}` for the unauthenticated
 *   call.
 */
export async function test_api_platform_admin_seller_payout_detail_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Join as platform admin, which also sets the Authorization header.
  const adminJoinInput =
    typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(admin);

  // 2. Create a guest cart to reflect upstream guest activity.
  const guestCartCreateBody = typia.random<IShoppingMallGuestCart.ICreate>();
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartCreateBody,
    });
  typia.assert(guestCart);

  // 3. Create a seller payout batch as the authenticated platform admin.
  const payoutCreateBody = typia.random<IShoppingMallSellerPayout.ICreate>();
  const payout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(payout);

  // 4. Build an unauthenticated connection without any headers.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to access payout details without a valid admin token and expect an error.
  await TestValidator.error(
    "unauthorized seller payout detail access is rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.at(
        unauthenticated,
        {
          sellerPayoutId: payout.id,
        },
      );
    },
  );
}
