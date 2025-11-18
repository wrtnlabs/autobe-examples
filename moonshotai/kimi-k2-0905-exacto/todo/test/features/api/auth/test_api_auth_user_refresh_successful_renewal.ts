import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful token renewal using valid refresh token. Validates that the
 * system properly validates refresh tokens, issues new access tokens with
 * updated expiration times, and maintains session continuity.
 */
export async function test_api_auth_user_refresh_successful_renewal(
  connection: api.IConnection,
) {
  // Test 1: Refresh with explicit IP address
  const refreshRequestWithIP: ITodoAppUser.IRefresh = {
    refresh_token: RandomGenerator.alphaNumeric(32), // More realistic token format
    href: `https://todo-app.example.com/dashboard`,
    referrer: `https://todo-app.example.com/login`,
    ip: "192.168.1.100",
  } satisfies ITodoAppUser.IRefresh;

  const refreshResponse1: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshRequestWithIP,
    });

  typia.assert(refreshResponse1);

  // Validate user authorization data
  TestValidator.equals("user ID format", typeof refreshResponse1.id, "string");
  TestValidator.equals(
    "user email format",
    typeof refreshResponse1.email,
    "string",
  );
  TestValidator.equals(
    "created_at exists",
    refreshResponse1.created_at !== undefined,
    true,
  );

  // Store original tokens for comparison
  const originalAccessToken = refreshResponse1.token.access;
  const originalRefreshToken = refreshResponse1.token.refresh;
  const originalExpiredAt = refreshResponse1.token.expired_at;
  const originalRefreshableUntil = refreshResponse1.token.refreshable_until;

  // Test 2: Refresh again with null IP to test nullable scenario
  const refreshRequestNoIP: ITodoAppUser.IRefresh = {
    refresh_token: originalRefreshToken,
    href: `https://todo-app.example.com/tasks`,
    referrer: `https://todo-app.example.com/dashboard`,
    ip: null,
  } satisfies ITodoAppUser.IRefresh;

  const refreshResponse2: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshRequestNoIP,
    });

  typia.assert(refreshResponse2);

  // Validate token structure and properties
  const tokenData = refreshResponse2.token;
  TestValidator.equals(
    "access token exists",
    tokenData.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    tokenData.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at format",
    typeof tokenData.expired_at,
    "string",
  );
  TestValidator.equals(
    "refreshable_until format",
    typeof tokenData.refreshable_until,
    "string",
  );

  // Verify new tokens are different from original (renewal actually occurred)
  TestValidator.notEquals(
    "new access token differs",
    tokenData.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    tokenData.refresh,
    originalRefreshToken,
  );

  // Verify token expiration timestamps are valid and updated
  const currentTime = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is future date",
    new Date(tokenData.expired_at) > new Date(currentTime),
  );
  TestValidator.predicate(
    "refreshable_until is future date",
    new Date(tokenData.refreshable_until) > new Date(currentTime),
  );

  // Validate that new expiration times are later than original (tokens should have extended validity)
  TestValidator.predicate(
    "new expired_at extends validity",
    new Date(tokenData.expired_at) >= new Date(originalExpiredAt),
  );

  // Test session continuity - verify user data remains consistent
  TestValidator.equals(
    "user ID remains consistent",
    refreshResponse1.id,
    refreshResponse2.id,
  );
  TestValidator.equals(
    "user email remains consistent",
    refreshResponse1.email,
    refreshResponse2.email,
  );
  TestValidator.equals(
    "created_at remains consistent",
    refreshResponse1.created_at,
    refreshResponse2.created_at,
  );

  // Verify authorization header is updated with new token
  TestValidator.equals(
    "authorization header set",
    connection.headers?.Authorization !== undefined,
    true,
  );
  TestValidator.equals(
    "authorization header updated with new token",
    connection.headers!.Authorization,
    tokenData.access,
  );
}
