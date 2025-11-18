import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test refresh endpoint security by attempting to refresh with invalid or
 * malformed refresh tokens.
 *
 * This test validates that the token refresh endpoint properly rejects various
 * types of invalid refresh tokens and does not generate valid authentication
 * tokens from unauthorized input.
 *
 * Test scenarios:
 *
 * 1. Completely random string (not JWT format)
 * 2. Malformed JWT structure
 * 3. Valid JWT format but never issued by the system
 * 4. Empty string
 * 5. Very long random string
 */
export async function test_api_guest_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Test 1: Completely random string - not a valid JWT format
  await TestValidator.error("random string should be rejected", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(32),
      } satisfies ITodoListGuest.IRefresh,
    });
  });

  // Test 2: Malformed JWT structure - missing parts
  await TestValidator.error("malformed JWT should be rejected", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "invalid.token",
      } satisfies ITodoListGuest.IRefresh,
    });
  });

  // Test 3: Valid JWT structure but fake signature (never issued)
  await TestValidator.error("fake JWT should be rejected", async () => {
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: fakeJwt,
      } satisfies ITodoListGuest.IRefresh,
    });
  });

  // Test 4: Empty string
  await TestValidator.error("empty token should be rejected", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoListGuest.IRefresh,
    });
  });

  // Test 5: Very long random string
  await TestValidator.error(
    "very long random string should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(500),
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 6: JWT-like format with invalid characters
  await TestValidator.error(
    "JWT with invalid characters should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "invalid@token#with$special%chars",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
