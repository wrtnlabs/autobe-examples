import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_authentication_token_refresh_security_context(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = "SecurePass123!";

  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Extract initial tokens from join response
  const initialAccessToken = joinResponse.token.access;
  const initialRefreshToken = joinResponse.token.refresh;
  const initialExpiredAt = joinResponse.token.expired_at;
  const initialRefreshableUntil = joinResponse.token.refreshable_until;

  // Verify initial authorization header was set
  TestValidator.predicate(
    "initial access token should be set in authorization header",
    connection.headers?.Authorization === `Bearer ${initialAccessToken}`,
  );

  // Step 3: Create fresh connection for refresh without modifying original auth context
  const refreshConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers },
  };

  // Step 4: Refresh tokens using the refresh token
  const refreshResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(refreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 5: Extract refreshed tokens
  const refreshedAccessToken = refreshResponse.token.access;
  const refreshedRefreshToken = refreshResponse.token.refresh;
  const refreshedExpiredAt = refreshResponse.token.expired_at;
  const refreshedRefreshableUntil = refreshResponse.token.refreshable_until;

  // Step 6: Verify security context is maintained
  // Moderator identity should remain the same
  TestValidator.equals(
    "moderator ID should remain unchanged after token refresh",
    refreshResponse.id,
    joinResponse.id,
  );

  TestValidator.equals(
    "moderator email should remain unchanged after token refresh",
    refreshResponse.email,
    joinResponse.email,
  );

  TestValidator.equals(
    "moderator username should remain unchanged after token refresh",
    refreshResponse.username,
    joinResponse.username,
  );

  // Step 7: Verify authorization level is maintained
  // Account status should not change
  TestValidator.equals(
    "account status should remain unchanged after token refresh",
    refreshResponse.account_status,
    joinResponse.account_status,
  );

  // Karma score should not decrease (permission degradation check)
  TestValidator.predicate(
    "karma score should not decrease after token refresh",
    refreshResponse.karma_score >= joinResponse.karma_score,
  );

  // Step 8: Verify token values are different (new tokens issued)
  TestValidator.notEquals(
    "refreshed access token should be different from original",
    refreshedAccessToken,
    initialAccessToken,
  );

  TestValidator.notEquals(
    "refreshed refresh token should be different from original",
    refreshedRefreshToken,
    initialRefreshToken,
  );

  // Step 9: Verify new tokens have valid expiration
  TestValidator.predicate(
    "refreshed access token expiration should be in the future",
    new Date(refreshedExpiredAt) > new Date(),
  );

  TestValidator.predicate(
    "refreshed refresh token should be usable until a future date",
    new Date(refreshedRefreshableUntil) > new Date(),
  );

  // Step 10: Verify email verification status is maintained
  TestValidator.equals(
    "email verification status should be maintained after token refresh",
    refreshResponse.email_verified,
    joinResponse.email_verified,
  );

  // Step 11: Login with original credentials to verify moderator can still authenticate
  const loginConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers },
  };

  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(loginConnection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://community.example.com/auth/login",
        referrer: "https://community.example.com/login",
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loginResponse);

  // Step 12: Verify re-login maintains same security context
  TestValidator.equals(
    "moderator ID should be consistent across login operations",
    loginResponse.id,
    joinResponse.id,
  );

  TestValidator.equals(
    "moderator permissions level should be consistent across login operations",
    loginResponse.account_status,
    joinResponse.account_status,
  );

  // Step 13: Verify refreshed tokens work for authenticated operations
  const secondRefreshConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${refreshedAccessToken}`,
    },
  };

  const secondRefreshResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(secondRefreshConnection, {
      body: {
        refresh_token: refreshedRefreshToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    });
  typia.assert(secondRefreshResponse);

  // Verify ongoing refresh cycles maintain consistent security context
  TestValidator.equals(
    "moderator ID should persist through multiple refresh cycles",
    secondRefreshResponse.id,
    joinResponse.id,
  );

  TestValidator.equals(
    "account status should persist through multiple refresh cycles",
    secondRefreshResponse.account_status,
    joinResponse.account_status,
  );
}
