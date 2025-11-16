import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test token refresh functionality across different administrator privilege
 * levels.
 *
 * This test ensures that the token refresh mechanism works consistently for all
 * admin types (super_admin, moderator, support), validating that privilege
 * levels do not affect the token refresh capability. Each admin type should be
 * able to maintain continuous sessions through token rotation regardless of
 * their administrative hierarchy position.
 *
 * Test workflow:
 *
 * 1. Create three admin accounts with different privilege levels (super_admin,
 *    moderator, support)
 * 2. Extract refresh tokens from each authentication response
 * 3. Perform token refresh operations for each admin type
 * 4. Validate successful token refresh for all privilege levels
 * 5. Verify admin_level preservation and new token issuance
 */
export async function test_api_admin_token_refresh_with_different_admin_levels(
  connection: api.IConnection,
) {
  const adminLevels = ["super_admin", "moderator", "support"] as const;

  const admins: IShoppingMallAdmin.IAuthorized[] = await ArrayUtil.asyncMap(
    adminLevels,
    async (level) => {
      const createData = {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: level,
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate;

      const admin = await api.functional.auth.admin.join(connection, {
        body: createData,
      });
      typia.assert(admin);

      return admin;
    },
  );

  await ArrayUtil.asyncForEach(admins, async (admin) => {
    const refreshedAdmin = await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: admin.token.refresh,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
    typia.assert(refreshedAdmin);

    TestValidator.equals(
      "admin_level should be preserved after token refresh",
      refreshedAdmin.admin_level,
      admin.admin_level,
    );

    TestValidator.equals(
      "admin id should remain the same",
      refreshedAdmin.id,
      admin.id,
    );

    TestValidator.predicate(
      "new access token should be issued",
      refreshedAdmin.token.access !== admin.token.access,
    );

    TestValidator.predicate(
      "new refresh token should be issued",
      refreshedAdmin.token.refresh !== admin.token.refresh,
    );
  });
}
