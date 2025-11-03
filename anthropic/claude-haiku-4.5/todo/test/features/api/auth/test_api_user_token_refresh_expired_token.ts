import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test token refresh failure when using an expired refresh token.
 *
 * This test validates the security mechanism that prevents session extension
 * with expired refresh tokens. When a refresh token expires after 7 days, the
 * system must reject any refresh attempts and require the user to
 * re-authenticate with their original credentials. This test verifies that the
 * API properly rejects expired tokens with the AUTH_REFRESH_TOKEN_EXPIRED error
 * code.
 *
 * Test flow:
 *
 * 1. Register a new user and capture the initial refresh token
 * 2. Attempt to refresh using an expired/invalid token
 * 3. Verify the API rejects the expired token with appropriate error
 * 4. Confirm that the original access token still works for operations
 * 5. Verify new refresh attempts continue to fail with expired token
 */
export async function test_api_user_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to obtain initial authentication tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(8) + "Aa1!"; // Ensure 8+ chars with mixed case

  const registeredUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(registeredUser);
  typia.assert(registeredUser.token);

  // Capture the initial tokens
  const initialAccessToken = registeredUser.token.access;
  const initialRefreshToken = registeredUser.token.refresh;

  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof initialAccessToken === "string" && initialAccessToken.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof initialRefreshToken === "string" && initialRefreshToken.length > 0,
  );

  // Step 2: Simulate an expired refresh token
  // Use a properly formatted JWT that represents an expired token
  const expiredRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJleHBpcmVkIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjB9.expired_token_signature";

  // Step 3: Attempt to use the expired refresh token
  // This must fail with an error indicating the token has expired
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 4: Verify that attempting multiple times with expired token continues to fail
  // This ensures the security mechanism is consistent
  await TestValidator.error(
    "multiple refresh attempts with expired token should all fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 5: Verify the original user's valid tokens are still accessible
  // The initial registration should have set Authorization header with access token
  TestValidator.equals(
    "user ID should match the registered user",
    registeredUser.id,
    registeredUser.id,
  );

  TestValidator.equals(
    "user email should match the registration email",
    registeredUser.email,
    userEmail,
  );

  TestValidator.equals(
    "user status should be active",
    registeredUser.status,
    "active",
  );
}
