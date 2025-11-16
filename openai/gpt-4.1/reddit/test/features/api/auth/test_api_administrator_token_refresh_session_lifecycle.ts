import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";

/**
 * Validates the complete session token lifecycle for administrator
 * authentication:
 *
 * - Registers a new administrator account and receives initial authentication
 *   tokens.
 * - Uses the original refresh token to obtain a new session (refreshes tokens)
 *   via the /auth/administrator/refresh endpoint.
 * - Ensures the refreshed token is valid, belongs to the same administrator, and
 *   updates the session appropriately.
 * - Attempts to misuse the refresh API with an invalid/modified token and
 *   confirms it is rejected.
 */
export async function test_api_administrator_token_refresh_session_lifecycle(
  connection: api.IConnection,
) {
  // Register new administrator, receive initial tokens
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);

  // Token extraction
  const originalToken: IAuthorizationToken = adminAccount.token;
  typia.assert(originalToken);

  // Use refresh token to obtain new tokens
  const refreshed = await api.functional.auth.administrator.refresh(
    connection,
    {
      body: {
        refresh_token: originalToken.refresh,
      } satisfies ICommunityPlatformAdministrator.IRefresh,
    },
  );
  typia.assert(refreshed);

  // Ensure refreshed for the same administrator
  TestValidator.equals(
    "admin id is stable on token refresh",
    refreshed.id,
    adminAccount.id,
  );
  TestValidator.equals(
    "admin email is stable on token refresh",
    refreshed.email,
    adminAccount.email,
  );

  // Refreshed tokens must differ from originals (new session)
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    originalToken.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    originalToken.refresh,
  );

  // Refreshed token validity: must have valid expiration times in the future
  TestValidator.predicate(
    "access token expiration is in the future",
    new Date(refreshed.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(refreshed.token.refreshable_until) > new Date(),
  );

  // Negative case: use invalid/modified token
  const tamperedRefreshToken =
    originalToken.refresh.slice(0, -1) +
    (originalToken.refresh.endsWith("a") ? "b" : "a");
  await TestValidator.error(
    "using tampered refresh token is rejected",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: tamperedRefreshToken,
        } satisfies ICommunityPlatformAdministrator.IRefresh,
      });
    },
  );
}
