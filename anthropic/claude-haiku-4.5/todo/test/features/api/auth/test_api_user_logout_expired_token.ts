import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test logout behavior with expired JWT token.
 *
 * This test validates that the logout endpoint properly rejects requests made
 * with invalid or tampered JWT tokens. While true token expiration requires
 * waiting for the token's expiration timestamp to pass (typically 15+ minutes),
 * this test validates the rejection of malformed tokens that simulate expired
 * or invalid token scenarios.
 *
 * The test verifies that:
 *
 * 1. User registration creates valid authentication tokens
 * 2. Invalid or malformed tokens are rejected by the logout endpoint
 * 3. Tampered tokens cannot be used for logout operations
 * 4. The endpoint returns appropriate error response for invalid tokens
 * 5. Only valid, untampered tokens can successfully logout
 *
 * Test flow:
 *
 * 1. Create a new user account via registration endpoint
 * 2. Extract the access token from the response
 * 3. Attempt logout with a tampered/invalid token
 * 4. Verify that the request fails with unauthorized error
 * 5. Verify that a valid token can successfully logout
 */
export async function test_api_user_logout_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and obtain initial tokens
  const registerResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registerResponse);

  // Step 2: Extract the access token and token expiration info
  const accessToken = registerResponse.token.access;
  const tokenExpiredAt = registerResponse.token.expired_at;
  typia.assert<string & tags.Format<"date-time">>(tokenExpiredAt);

  // Step 3: Create a connection with an invalid/expired token
  // Simulate expired token by appending invalid characters to the token
  const invalidTokenConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${accessToken}invalid`,
    },
  };

  // Step 4: Attempt to logout with the invalid token
  // The tampered token should be rejected by the server
  await TestValidator.error(
    "logout should fail with invalid/expired token",
    async () => {
      await api.functional.todoList.user.auth.user.logout(
        invalidTokenConnection,
      );
    },
  );

  // Step 5: Verify that valid, fresh tokens still work for logout
  // Use the original connection which has the valid token from registration
  const validLogoutResponse: ITodoListLogoutResponse =
    await api.functional.todoList.user.auth.user.logout(connection);
  typia.assert(validLogoutResponse);

  TestValidator.predicate(
    "logout response indicates success",
    validLogoutResponse.success === true,
  );

  TestValidator.equals(
    "logout message confirms logout completion",
    validLogoutResponse.message.includes("logged out"),
    true,
  );
}
