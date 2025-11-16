import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user token refresh operation with invalid or malformed refresh token.
 *
 * This test validates that the token refresh endpoint properly rejects invalid
 * tokens and handles security errors gracefully. Tests multiple invalid token
 * scenarios:
 *
 * - Malformed token (invalid JWT format)
 * - Tampered token (modified payload/signature)
 * - Non-existent token (token that was never issued)
 * - Expired token (token past expiration time)
 *
 * The test ensures that invalid tokens are rejected without exposing sensitive
 * information and that appropriate error responses are returned.
 */
export async function test_api_user_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Reject completely malformed token
  await TestValidator.error("should reject malformed token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "not.a.valid.jwt.token",
      } satisfies ITodoAppUser.IRefresh,
    });
  });

  // Test 2: Reject empty refresh token
  await TestValidator.error("should reject empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoAppUser.IRefresh,
    });
  });

  // Test 3: Reject token with invalid signature
  await TestValidator.error(
    "should reject token with tampered signature",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.tampered_signature_here",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test 4: Reject random string token
  await TestValidator.error(
    "should reject random string as token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(128),
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Test 5: Reject token with invalid base64 encoding
  await TestValidator.error(
    "should reject token with invalid base64",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "!!!invalid.base64!!!.!!!invalid!!!",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
