import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh failure when using an expired refresh token.
 *
 * This scenario validates the security mechanism that prevents token reuse
 * after expiration. The test creates a new user account, obtains initial
 * tokens, then simulates token expiration by using an invalid refresh token
 * format. Validates that the system correctly rejects invalid/expired refresh
 * tokens and maintains security integrity by preventing unauthorized token
 * refresh.
 */
export async function test_api_user_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Extract the initial refresh token from the authentication response
  const validRefreshToken = user.token.refresh;

  // Step 3: Test with various invalid token scenarios that simulate expiration
  // Since we cannot actually wait for token expiration in a test environment,
  // we test with clearly invalid tokens that should be rejected

  // Test with malformed token (simulates corrupted or invalid token)
  await TestValidator.error(
    "should reject malformed refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "invalid_token_format_" + RandomGenerator.alphaNumeric(20),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test with empty token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Test with token that has expired format pattern
  await TestValidator.error(
    "should reject expired-looking token format",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "expired_" + typia.random<string & tags.Format<"uuid">>(),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Step 4: Verify that valid token refresh still works (control test)
  // This ensures our invalid token tests are meaningful
  const refreshedUser = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(refreshedUser);

  TestValidator.equals(
    "refreshed user should have same email",
    refreshedUser.email,
    user.email,
  );

  TestValidator.notEquals(
    "refresh token should be rotated after successful refresh",
    refreshedUser.token.refresh,
    validRefreshToken,
  );
}
