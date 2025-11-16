import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate adminUser token refresh workflow for active accounts.
 *
 * Business goal (adapted from scenario):
 *
 * - When an adminUser is active, a previously issued refresh token can be used to
 *   obtain new JWT tokens via POST /auth/adminUser/refresh.
 * - The backend documentation states that refresh checks
 *   community_platform_adminusers state, including deleted_at, is_suspended,
 *   is_banned, and lock/ban flags.
 *
 * Given constraints:
 *
 * - No admin-management delete or suspend endpoints are available in the provided
 *   SDK, so we cannot actually soft-delete an adminUser in this test.
 * - Therefore, we focus on the positive path for an active account and rely on
 *   backend guarantees (deleted_at checks) without trying to simulate deleted
 *   state.
 *
 * Workflow:
 *
 * 1. Join a new adminUser using /auth/adminUser/join, with a realistic join
 *    payload.
 * 2. Assert the returned ICommunityPlatformAdminuser.IAuthorized structure.
 * 3. Extract the refresh token from the embedded IAuthorizationToken.
 * 4. Call /auth/adminUser/refresh with the refresh token and assert the response
 *    shape.
 * 5. Call /auth/adminUser/refresh multiple times to ensure repeated refresh calls
 *    using valid tokens continue to work for active accounts.
 */
export async function test_api_admin_user_token_refresh_for_soft_deleted_account_denied(
  connection: api.IConnection,
) {
  // 1. Join a new adminUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joined: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(joined);

  // Basic sanity checks on joined payload
  TestValidator.predicate(
    "joined adminUser has uuid id",
    () => typeof joined.id === "string" && joined.id.length > 0,
  );
  TestValidator.predicate(
    "joined adminUser username matches join input",
    () => joined.username === joinBody.username,
  );
  TestValidator.predicate(
    "joined adminUser email matches join input",
    () => joined.email === joinBody.email,
  );

  const initialToken: IAuthorizationToken = joined.token;
  typia.assert<IAuthorizationToken>(initialToken);

  // 2. Perform a refresh using the original refresh token
  const refreshBody = {
    refreshToken: initialToken.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  const refreshed: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: refreshBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(refreshed);

  // Validate identity consistency between join and refreshed contexts
  TestValidator.equals(
    "refreshed adminUser id should remain same",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "refreshed adminUser username should remain same",
    refreshed.username,
    joined.username,
  );
  TestValidator.equals(
    "refreshed adminUser email should remain same",
    refreshed.email,
    joined.email,
  );

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert<IAuthorizationToken>(refreshedToken);

  TestValidator.predicate(
    "refreshed access token should differ from initial access token",
    () => refreshedToken.access !== initialToken.access,
  );

  // 3. Call refresh multiple times to ensure active account continues to refresh
  const secondRefreshBody = {
    refreshToken: refreshedToken.refresh,
  } satisfies ICommunityPlatformAdminUserRefresh.IRequest;

  const secondRefreshed: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(secondRefreshed);

  TestValidator.equals(
    "second refreshed adminUser id should remain same",
    secondRefreshed.id,
    joined.id,
  );
  TestValidator.predicate(
    "second refreshed access token should differ from previous ones",
    () =>
      secondRefreshed.token.access !== refreshedToken.access &&
      secondRefreshed.token.access !== initialToken.access,
  );
}
