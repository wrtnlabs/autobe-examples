import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates token refresh error handling for invalid or malformed refresh
 * tokens.
 *
 * This test ensures the authentication system properly rejects tokens with
 * invalid JWT signatures, corrupted formats, or tampered content. By attempting
 * to refresh with various forms of invalid tokens, this test validates security
 * protections against unauthorized token manipulation attempts.
 *
 * Test flow:
 *
 * 1. Register a new user to establish valid authentication baseline
 * 2. Extract the valid refresh token from the registration response
 * 3. Attempt token refresh with corrupted/invalid token formats
 * 4. Verify each invalid token attempt is rejected with appropriate error
 * 5. Confirm malformed tokens cannot be used for authentication bypass
 */
export async function test_api_user_token_refresh_invalid_token_format(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish baseline and obtain valid token structure
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(12); // Generate secure password > 8 chars

  const registration: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(registration);

  // Step 2: Extract the valid refresh token to understand token structure
  const validRefreshToken = registration.token.refresh;
  TestValidator.predicate(
    "valid refresh token should be non-empty string",
    typeof validRefreshToken === "string" && validRefreshToken.length > 0,
  );

  // Step 3: Test with corrupted token format (incomplete JWT structure)
  await TestValidator.error(
    "should reject corrupted token with missing signature",
    async () => {
      const corruptedToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"; // Valid header and payload but no signature
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: corruptedToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 4: Test with tampered token (modified payload)
  await TestValidator.error(
    "should reject token with tampered payload",
    async () => {
      const tamperedToken = validRefreshToken.slice(0, -10) + "tampered00"; // Modify last 10 characters
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: tamperedToken,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 5: Test with completely invalid format (not JWT)
  await TestValidator.error("should reject non-JWT token format", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "not.a.valid.jwt.token",
      } satisfies ITodoAppUser.IRefresh,
    });
  });

  // Step 6: Test with empty string token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoAppUser.IRefresh,
    });
  });

  // Step 7: Test with token containing only whitespace
  await TestValidator.error(
    "should reject whitespace-only refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "   ",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 8: Test with malformed JWT (invalid base64)
  await TestValidator.error(
    "should reject JWT with invalid base64 encoding",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "!!!invalid.base64.encoding!!!",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
