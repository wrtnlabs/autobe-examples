import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh security with invalid refresh tokens.
 *
 * This test validates that the authentication system properly rejects invalid
 * refresh tokens and prevents unauthorized access through token forgery
 * attempts.
 *
 * The test performs multiple scenarios:
 *
 * 1. Attempt refresh with a completely invalid random string
 * 2. Attempt refresh with an empty string
 * 3. Attempt refresh with a malformed JWT-like token
 * 4. Attempt refresh with a fabricated token string
 *
 * Each scenario validates that the system:
 *
 * - Rejects the invalid token with an appropriate authentication error
 * - Does not compromise security or reveal information about valid tokens
 * - Prevents token forgery and unauthorized access attempts
 */
export async function test_api_user_token_refresh_with_invalid_refresh_token(
  connection: api.IConnection,
) {
  // Test 1: Attempt refresh with completely invalid random string
  await TestValidator.error(
    "should reject completely invalid random token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(32),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with empty string
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Test 3: Attempt refresh with malformed JWT-like structure
  await TestValidator.error(
    "should reject malformed JWT-like token",
    async () => {
      const malformedJwt = [
        RandomGenerator.alphaNumeric(20),
        RandomGenerator.alphaNumeric(30),
        RandomGenerator.alphaNumeric(25),
      ].join(".");

      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: malformedJwt,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test 4: Attempt refresh with fabricated token
  await TestValidator.error(
    "should reject fabricated token string",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "fabricated_invalid_token_" + RandomGenerator.alphaNumeric(40),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test 5: Attempt refresh with special characters token
  await TestValidator.error(
    "should reject token with special characters",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "!@#$%^&*()_+{}[]|\\:;<>?,./~`",
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
