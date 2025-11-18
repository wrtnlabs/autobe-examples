import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminProfile";

/**
 * Ensure admin profile endpoint rejects unauthenticated access.
 *
 * Business goal:
 *
 * - Prove that GET /shoppingMall/admin/admins/{adminId}/profile cannot be invoked
 *   without an Authorization token, even when the adminId itself is valid.
 *
 * Scenario outline:
 *
 * 1. Create a real administrator account using POST /auth/admin/join so that we
 *    have a realistic adminId.
 * 2. Build an unauthenticated connection object derived from the provided
 *    connection, but with an empty headers object to ensure no Authorization
 *    header is present.
 * 3. Call the profile endpoint with the unauthenticated connection and the real
 *    adminId and assert that the call fails with an HTTP 401 Unauthorized (or
 *    the platform’s unauthenticated status) using TestValidator.httpError.
 * 4. Optionally, prove the happy-path behaviour by calling the same endpoint again
 *    with the original (authenticated) connection and assert that a valid
 *    IShoppingMallAdminProfile is returned.
 */
export async function test_api_admin_profile_get_forbidden_for_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Arrange: create a real admin to obtain a valid adminId
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  const adminId: string = authorized.id;

  // 2. Build an unauthenticated connection by cloning host/options but
  //    overriding headers with an empty object. Do not touch the original
  //    connection.headers.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Assert that unauthenticated access is forbidden
  await TestValidator.httpError(
    "unauthenticated admin profile access must be rejected",
    401,
    async () => {
      await api.functional.shoppingMall.admin.admins.profile.at(
        unauthConnection,
        { adminId },
      );
    },
  );

  // 4. Optional sanity: using the authenticated connection should succeed
  const profile: IShoppingMallAdminProfile =
    await api.functional.shoppingMall.admin.admins.profile.at(connection, {
      adminId,
    });
  typia.assert<IShoppingMallAdminProfile>(profile);
}
