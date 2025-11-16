import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that deleting a non-existent seller as a platform admin results in a
 * 404 Not Found HTTP error without breaking the admin context.
 *
 * Business background:
 *
 * - Platform administrators manage seller lifecycles via
 *   /shoppingMall/platformAdmin/sellers endpoints.
 * - Hard-deleting a seller that does not exist must not silently succeed nor
 *   corrupt the platform admin session; instead, it must clearly indicate a
 *   not-found condition.
 *
 * Scenario steps:
 *
 * 1. Register (join) a new platform administrator using POST
 *    /auth/platformAdmin/join to establish an authenticated context.
 * 2. Generate a random UUID to represent a sellerId that is not present in the
 *    system (no seller is created in this test).
 * 3. Invoke DELETE /shoppingMall/platformAdmin/sellers/{sellerId} via the SDK
 *    function api.functional.shoppingMall.platformAdmin.sellers.erase using
 *    that random sellerId as path parameter.
 * 4. Use TestValidator.httpError to assert that the call fails with HTTP 404,
 *    validating that the API properly reports the non-existent seller.
 * 5. Perform a secondary sanity check by invoking platformAdmin.join again to
 *    ensure that authentication and subsequent platform admin operations still
 *    work after the failed delete attempt, which indirectly confirms no hidden
 *    side effects on auth/session state.
 */
export async function test_api_platform_admin_delete_seller_not_found(
  connection: api.IConnection,
) {
  // 1. Register (join) a new platform administrator
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Generate a random UUID for a non-existent sellerId
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt to erase the non-existent seller and expect HTTP 404
  await TestValidator.httpError(
    "delete non-existent seller must return 404",
    404,
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.erase(
        connection,
        {
          sellerId,
        },
      );
    },
  );

  // 5. Sanity check: join another platform admin to ensure the system
  //    remains operational and authentication still works after the
  //    failed delete.
  const secondJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const secondAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondJoinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(secondAdmin);
}
