import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test token refresh failure scenario with expired refresh tokens.
 *
 * This test validates the security mechanism that prevents expired refresh
 * tokens from obtaining new access tokens. The test establishes user
 * authentication context, obtains tokens, and attempts refresh operation with
 * tokens that should be expired to verify proper error handling and security
 * enforcement.
 */
export async function test_api_user_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const createdUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://todoapp.example.com/register",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(createdUser);

  // Step 2: Obtain initial tokens through login
  const initialTokens = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://todoapp.example.com/login",
      referrer: "https://todoapp.example.com",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(initialTokens);

  // Step 3: Extract token expiration information for validation
  const refreshExpiration = new Date(initialTokens.token.refreshable_until);
  const accessExpiration = new Date(initialTokens.token.expired_at);

  // Validate that tokens have expiration times set
  TestValidator.predicate(
    "refresh token has future expiration time",
    refreshExpiration > new Date(),
  );

  TestValidator.predicate(
    "access token has future expiration time",
    accessExpiration > new Date(),
  );

  // Step 4: Attempt to refresh with the same token immediately - should work
  // This validates that the refresh token is initially valid
  const refreshedTokens = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: initialTokens.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshedTokens);

  // Step 5: Now attempt to refresh with the original (now invalid) token
  // After a successful refresh, the original refresh token should be invalidated
  await TestValidator.error(
    "refresh should fail with previously used token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: initialTokens.token.refresh,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 6: Validate that the new tokens are different from the original ones
  TestValidator.notEquals(
    "new access token should differ from original",
    refreshedTokens.token.access,
    initialTokens.token.access,
  );

  TestValidator.notEquals(
    "new refresh token should differ from original",
    refreshedTokens.token.refresh,
    initialTokens.token.refresh,
  );

  // Step 7: Additional security validation
  // The new tokens should have updated expiration times
  const newRefreshExpiration = new Date(
    refreshedTokens.token.refreshable_until,
  );
  const newAccessExpiration = new Date(refreshedTokens.token.expired_at);

  TestValidator.predicate(
    "new refresh token has future expiration time",
    newRefreshExpiration > new Date(),
  );

  TestValidator.predicate(
    "new access token has future expiration time",
    newAccessExpiration > new Date(),
  );
}
