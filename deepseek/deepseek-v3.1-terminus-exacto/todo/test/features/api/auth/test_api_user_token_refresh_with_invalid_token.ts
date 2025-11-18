import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh failure when using an invalid or malformed refresh token.
 * This scenario validates the system's ability to detect and reject tampered or
 * corrupted tokens. The test attempts to refresh using various invalid token
 * formats including empty strings, malformed JWT structures, and tokens with
 * incorrect signatures. Validates that proper error handling prevents security
 * breaches through token manipulation attempts.
 */
export async function test_api_user_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Empty string token
  await TestValidator.error("empty token should fail", async () => {
    return await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Test 2: Random alphanumeric string
  await TestValidator.error("random string token should fail", async () => {
    return await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(32),
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Test 3: Malformed JWT structure (missing parts)
  await TestValidator.error("malformed JWT should fail", async () => {
    return await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "header.payload", // Missing signature part
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Test 4: Malformed JWT structure (invalid base64)
  await TestValidator.error("invalid base64 JWT should fail", async () => {
    return await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "invalid.header.invalid", // Invalid base64 encoding
      } satisfies ITodoListUser.IRefresh,
    });
  });

  // Test 5: Token with incorrect signature format
  await TestValidator.error(
    "incorrect signature format should fail",
    async () => {
      return await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", // Valid JWT structure but wrong signature
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
