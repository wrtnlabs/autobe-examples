import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

export async function test_api_moderator_refresh_valid_token(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials
  const loginData = {
    username: RandomGenerator.alphabets(8),
    password: "password123",
    href: "https://test.com/login",
    referrer: "https://test.com",
  } satisfies IEconomicDiscussionModerator.ILogin;

  // Initial login to obtain auth token with refresh token
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: loginData,
  });
  typia.assert(loginResponse);

  // Store token information before refresh
  const originalAccessToken = loginResponse.token.access;
  const originalRefreshToken = loginResponse.token.refresh;
  const originalExpiredAt = loginResponse.token.expired_at;

  TestValidator.equals(
    "Original access token exists",
    !originalAccessToken,
    false,
  );
  TestValidator.equals(
    "Original refresh token exists",
    !originalRefreshToken,
    false,
  );

  // Wait a moment to ensure timestamp progression
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Refresh the authentication using the refresh token
  const refreshData = {
    refresh_token: originalRefreshToken,
    href: "https://test.com/refresh",
    referrer: "https://test.com",
  } satisfies IEconomicDiscussionModerator.IRefresh;

  const refreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: refreshData,
    },
  );
  typia.assert(refreshResponse);

  // Verify new tokens are issued
  TestValidator.equals(
    "New access token generated",
    refreshResponse.token.access !== originalAccessToken,
    true,
  );
  TestValidator.equals(
    "New refresh token generated",
    refreshResponse.token.refresh !== originalRefreshToken,
    true,
  );

  // Verify token structure integrity
  TestValidator.equals(
    "New access token format valid",
    refreshResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "New refresh token format valid",
    refreshResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "New expiration timestamp exists",
    !refreshResponse.token.expired_at,
    false,
  );

  // Verify user authorization context is maintained
  TestValidator.equals(
    "User ID maintained",
    refreshResponse.id,
    loginResponse.id,
  );
  TestValidator.equals(
    "Username maintained",
    refreshResponse.username,
    loginResponse.username,
  );
  TestValidator.equals(
    "Email verified status maintained",
    refreshResponse.email_verified,
    loginResponse.email_verified,
  );
  TestValidator.equals(
    "Two-factor status maintained",
    refreshResponse.two_factor_enabled,
    loginResponse.two_factor_enabled,
  );
  TestValidator.equals(
    "Moderation level maintained",
    refreshResponse.moderation_level,
    loginResponse.moderation_level,
  );

  // Verify timestamp progression (fix variable name conflicts)
  await TestValidator.predicate(
    "New expiration timestamp is future",
    () => new Date(refreshResponse.token.expired_at).getTime() > Date.now(),
  );
}
