import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { IMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberLogin";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import type { ITokenRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefresh";

/**
 * Test token refresh for an authenticated member.
 *
 * This test validates the JWT token refresh mechanism by:
 *
 * 1. Creating a new member account through registration
 * 2. Performing login to obtain initial access and refresh tokens
 * 3. Using the refresh token to request new tokens
 * 4. Validating that new tokens are generated with updated expiration times
 * 5. Ensuring tokens are distinct from the original set
 * 6. Verifying the member's authorization data remains consistent
 *
 * The test ensures continuous authentication works properly without requiring
 * re-login and validates the JWT lifecycle management implementation.
 */
export async function test_api_member_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);

  const joinRequestBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IMemberCreate.IRequest;

  const joinedMember = await api.functional.auth.member.join(connection, {
    body: joinRequestBody,
  });
  typia.assert(joinedMember);

  // Step 2: Login to obtain initial tokens
  const loginRequestBody = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IMemberLogin.IRequest;

  const initialAuth = await api.functional.auth.member.login(connection, {
    body: loginRequestBody,
  });
  typia.assert(initialAuth);

  // Store original token data for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  const originalRefreshableUntil = initialAuth.token.refreshable_until;

  // Step 3: Wait a moment to ensure timestamp differences
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Use refresh token to get new tokens
  const refreshRequestBody = {
    refresh: originalRefreshToken,
  } satisfies ITokenRefresh.IRequest;

  const refreshedAuth = await api.functional.auth.member.refresh(connection, {
    body: refreshRequestBody,
  });
  typia.assert(refreshedAuth);

  // Step 5: Validate refreshed tokens are different from original
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );

  // Step 6: Validate member data consistency
  TestValidator.equals(
    "member ID should remain consistent",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member email should remain consistent",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "member role should remain consistent",
    refreshedAuth.role,
    initialAuth.role,
  );

  // Step 7: Validate token expiration times are updated
  TestValidator.notEquals(
    "access token expiration should be updated",
    refreshedAuth.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "refresh token expiration should be updated",
    refreshedAuth.token.refreshable_until,
    originalRefreshableUntil,
  );

  // Step 8: Validate new expiration times are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "new access token should expire in the future",
    () => refreshedAuth.token.expired_at > now,
  );
  TestValidator.predicate(
    "new refresh token should be refreshable in the future",
    () => refreshedAuth.token.refreshable_until > now,
  );
}
