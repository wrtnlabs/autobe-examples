import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test token refresh failure when an invalid or expired refresh token is
 * provided. Validates proper error handling for refresh attempts with malformed
 * JWT tokens, expired refresh tokens, or tokens that don't correspond to valid
 * sessions. The operation should return appropriate error responses without
 * exposing sensitive authentication details.
 */
export async function test_api_user_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test case 1: Invalid JWT format - not a proper JWT token
  const invalidJwtToken = "invalid.jwt.token";

  await TestValidator.error(
    "refresh token with invalid JWT format should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: invalidJwtToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test case 2: Completely malformed token - random string
  const malformedToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "refresh token with malformed format should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: malformedToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test case 3: Empty string token
  await TestValidator.error(
    "refresh token with empty string should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test case 4: Verify error responses don't leak user information
  let errorResponse: any;
  try {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      } satisfies ITodoAppUser.IRefresh,
    });
  } catch (error) {
    errorResponse = error;
  }

  // Verify that error response doesn't contain sensitive user data
  TestValidator.predicate(
    "error response should not expose user email or ID",
    !errorResponse?.message?.includes("email") &&
      !errorResponse?.message?.includes("id"),
  );
}
