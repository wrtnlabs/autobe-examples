import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh with multiple consecutive refresh operations to validate
 * token rotation.
 *
 * This test creates a user account to obtain initial tokens, then performs
 * multiple consecutive refresh operations to ensure that token rotation works
 * correctly through multiple cycles. Each refresh operation should return valid
 * new tokens, and the refresh token should be updated with each refresh
 * operation, allowing for extended session lifetimes.
 *
 * Steps:
 *
 * 1. Create a user account to obtain initial authentication tokens
 * 2. Perform first refresh operation to get new tokens
 * 3. Use the new refresh token to perform second refresh operation
 * 4. Perform additional consecutive refreshes (3rd and 4th refresh)
 * 5. Validate that each refresh returns valid tokens with proper structure
 * 6. Verify that refresh tokens are updated with each refresh operation
 */
export async function test_api_user_token_refresh_multiple_consecutive_refreshes(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to obtain initial authentication tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "SecurePass123!";
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const initialUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: userHref,
      referrer: userReferrer,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(initialUser);

  // Validate initial token structure
  typia.assert(initialUser.token);
  TestValidator.predicate(
    "initial user has access token",
    initialUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial user has refresh token",
    initialUser.token.refresh.length > 0,
  );

  // Store initial refresh token for first refresh
  let currentRefreshToken = initialUser.token.refresh;
  const refreshTokens = [currentRefreshToken];

  // Step 2: Perform first refresh operation
  const firstRefresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: currentRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(firstRefresh);

  // Validate first refresh response
  TestValidator.predicate(
    "first refresh returns valid user data",
    firstRefresh.id === initialUser.id,
  );
  TestValidator.predicate(
    "first refresh returns new access token",
    firstRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh returns new refresh token",
    firstRefresh.token.refresh.length > 0,
  );

  // Update current refresh token
  currentRefreshToken = firstRefresh.token.refresh;
  refreshTokens.push(currentRefreshToken);

  // Step 3: Perform second refresh operation using the new refresh token
  const secondRefresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: currentRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(secondRefresh);

  // Validate second refresh response
  TestValidator.predicate(
    "second refresh returns valid user data",
    secondRefresh.id === initialUser.id,
  );
  TestValidator.predicate(
    "second refresh returns new access token",
    secondRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh returns new refresh token",
    secondRefresh.token.refresh.length > 0,
  );

  // Update current refresh token
  currentRefreshToken = secondRefresh.token.refresh;
  refreshTokens.push(currentRefreshToken);

  // Step 4: Perform third refresh operation for extended validation
  const thirdRefresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: currentRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(thirdRefresh);

  // Validate third refresh response
  TestValidator.predicate(
    "third refresh returns valid user data",
    thirdRefresh.id === initialUser.id,
  );
  TestValidator.predicate(
    "third refresh returns new access token",
    thirdRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "third refresh returns new refresh token",
    thirdRefresh.token.refresh.length > 0,
  );

  // Update current refresh token
  currentRefreshToken = thirdRefresh.token.refresh;
  refreshTokens.push(currentRefreshToken);

  // Step 5: Perform fourth refresh operation to further test token rotation
  const fourthRefresh = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: currentRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(fourthRefresh);

  // Validate fourth refresh response
  TestValidator.predicate(
    "fourth refresh returns valid user data",
    fourthRefresh.id === initialUser.id,
  );
  TestValidator.predicate(
    "fourth refresh returns new access token",
    fourthRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "fourth refresh returns new refresh token",
    fourthRefresh.token.refresh.length > 0,
  );

  refreshTokens.push(fourthRefresh.token.refresh);

  // Step 6: Validate that all refresh tokens are different (token rotation working)
  const uniqueRefreshTokens = new Set(refreshTokens);
  TestValidator.predicate(
    "all refresh tokens are unique indicating proper token rotation",
    uniqueRefreshTokens.size === refreshTokens.length,
  );

  // Validate that user data remains consistent across all refreshes
  TestValidator.equals(
    "user email remains consistent",
    fourthRefresh.email,
    initialUser.email,
  );
  TestValidator.equals(
    "user id remains consistent",
    fourthRefresh.id,
    initialUser.id,
  );
}
