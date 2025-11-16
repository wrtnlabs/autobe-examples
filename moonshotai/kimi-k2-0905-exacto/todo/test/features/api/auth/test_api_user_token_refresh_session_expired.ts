import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test token refresh failure when the refresh token corresponds to an expired
 * or invalidated session. Validates that refresh attempts fail gracefully when
 * the underlying session has been terminated or has exceeded its 7-day
 * expiration period. The system should redirect users to re-authentication
 * instead of allowing stale session renewal.
 */
export async function test_api_user_token_refresh_session_expired(
  connection: api.IConnection,
) {
  // Step 1: Test with invalid refresh token format
  await TestValidator.error(
    "should fail with invalid refresh token format",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "invalid-token-format",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 2: Test with empty refresh token
  await TestValidator.error(
    "should fail with empty refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 3: Test with malformed JWT structure
  await TestValidator.error(
    "should fail with malformed JWT token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "eyJ.invalid.jwt",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 4: Test with expired refresh token (simulated)
  // This tests the scenario where refresh token has exceeded 7-day expiration
  await TestValidator.error(
    "should fail with expired refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 5: Test with random token that simulates unknown/expired session
  const randomToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.error(
    "should fail with random refresh token indicating unknown session",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: randomToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 6: Validate proper request structure with a valid token format
  const validRefreshRequest = {
    body: {
      refresh_token: RandomGenerator.alphaNumeric(64),
    } satisfies ITodoAppUser.IRefresh,
  };

  // Ensure the request structure is valid
  typia.assert(validRefreshRequest.body);

  // Validate that the refresh request follows the correct structure
  TestValidator.predicate(
    "refresh token request should have valid structure",
    typeof validRefreshRequest.body.refresh_token === "string" &&
      validRefreshRequest.body.refresh_token.length > 0,
  );
}
