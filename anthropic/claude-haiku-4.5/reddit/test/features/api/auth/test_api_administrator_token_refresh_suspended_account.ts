import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test token refresh with valid refresh token.
 *
 * This test validates that token refresh operations work correctly when
 * provided with a valid, non-expired refresh token. The system should:
 *
 * 1. Create a new administrator account
 * 2. Extract the refresh token from the authorization response
 * 3. Use the refresh token to obtain a new access token
 * 4. Verify the new authorization response contains valid tokens
 * 5. Confirm the new access token is different from the original
 *
 * This ensures administrators can maintain active sessions through token
 * refresh without requiring full re-authentication with credentials.
 */
export async function test_api_administrator_token_refresh_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name(2);

  const joinResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin/register",
        referrer: null,
        ip: undefined,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Extract the refresh token from the authorization response
  const originalRefreshToken = joinResponse.token.refresh;
  const originalAccessToken = joinResponse.token.access;

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    originalRefreshToken.length > 0,
  );

  TestValidator.predicate(
    "access token should be a non-empty string",
    originalAccessToken.length > 0,
  );

  // Step 3: Verify the administrator account status is 'active'
  TestValidator.equals(
    "account status should be active after creation",
    joinResponse.account_status,
    "active",
  );

  // Step 4: Use the refresh token to obtain a new access token
  const refreshResponse: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ICommunityPlatformAdministrator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 5: Verify the refresh response contains valid tokens
  TestValidator.predicate(
    "refreshed access token should be a non-empty string",
    refreshResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token should be a non-empty string",
    refreshResponse.token.refresh.length > 0,
  );

  // Step 6: Confirm the new access token is different from the original
  TestValidator.notEquals(
    "refreshed access token should differ from original token",
    refreshResponse.token.access,
    originalAccessToken,
  );

  // Step 7: Verify expiration times are updated
  TestValidator.notEquals(
    "refreshed token expiration should be updated",
    refreshResponse.token.expired_at,
    joinResponse.token.expired_at,
  );

  // Step 8: Verify administrator information is preserved
  TestValidator.equals(
    "administrator email should be preserved after refresh",
    refreshResponse.email,
    joinResponse.email,
  );

  TestValidator.equals(
    "administrator username should be preserved after refresh",
    refreshResponse.username,
    joinResponse.username,
  );

  TestValidator.equals(
    "administrator id should be preserved after refresh",
    refreshResponse.id,
    joinResponse.id,
  );
}
