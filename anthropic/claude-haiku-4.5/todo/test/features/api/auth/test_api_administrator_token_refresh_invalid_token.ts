import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITokenRefreshRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefreshRequest";

/**
 * Test token refresh rejection when an invalid refresh token is submitted.
 *
 * Validates that the system properly rejects malformed, corrupted, or tampered
 * refresh tokens with HTTP 401 Unauthorized status. Ensures that invalid tokens
 * cannot be used to obtain new access tokens and that the system handles token
 * validation failures securely without exposing sensitive information.
 *
 * Test scenarios:
 *
 * 1. Submit a malformed token (missing JWT parts)
 * 2. Submit a token with corrupted signature
 * 3. Submit a token with invalid Base64 encoding
 * 4. Submit an empty token
 * 5. Verify HTTP 401 response with proper error handling
 * 6. Verify no access token is issued in error responses
 */
export async function test_api_administrator_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Submit a malformed token (incomplete JWT structure)
  const malformedToken = "invalid.token";
  await TestValidator.httpError(
    "should reject malformed refresh token with 401",
    401,
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: malformedToken,
        } satisfies ITokenRefreshRequest,
      });
    },
  );

  // Test 2: Submit a token with corrupted signature (valid structure but tampered)
  const corruptedSignatureToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.corrupted_signature_here";
  await TestValidator.httpError(
    "should reject token with corrupted signature with 401",
    401,
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: corruptedSignatureToken,
        } satisfies ITokenRefreshRequest,
      });
    },
  );

  // Test 3: Submit a token with invalid Base64 encoding
  const invalidBase64Token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9!!!invalid.payload!!!corrupted";
  await TestValidator.httpError(
    "should reject token with invalid Base64 encoding with 401",
    401,
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: invalidBase64Token,
        } satisfies ITokenRefreshRequest,
      });
    },
  );

  // Test 4: Submit an empty token
  await TestValidator.httpError(
    "should reject empty refresh token with 401",
    401,
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITokenRefreshRequest,
      });
    },
  );

  // Test 5: Submit a random string that looks like a token
  const randomInvalidToken = RandomGenerator.alphaNumeric(50);
  await TestValidator.httpError(
    "should reject random invalid token string with 401",
    401,
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: randomInvalidToken,
        } satisfies ITokenRefreshRequest,
      });
    },
  );
}
