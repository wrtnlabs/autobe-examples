import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest token refresh with invalid refresh token formats.
 *
 * Validates that the guest token refresh endpoint properly rejects malformed
 * refresh tokens that do not conform to JWT format specifications. The test
 * submits various invalid token formats including:
 *
 * - Tokens missing JWT structure (no dots separating parts)
 * - Tokens with invalid characters or corrupted data
 * - Empty or extremely short strings
 * - Tokens with incorrect segment counts
 *
 * The endpoint must reject all invalid token formats with an appropriate
 * authentication error and must not issue new tokens for invalid input.
 *
 * 1. Test rejection of token missing JWT structure (no dots)
 * 2. Test rejection of token with single dot only
 * 3. Test rejection of token with too many dots
 * 4. Test rejection of empty token string
 * 5. Test rejection of token with invalid characters
 * 6. Test rejection of very short invalid tokens
 */
export async function test_api_guest_token_refresh_invalid_token_format(
  connection: api.IConnection,
) {
  // Test 1: Token missing JWT structure (no dots - not a valid JWT)
  await TestValidator.error(
    "should reject token without JWT structure (no dots)",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "notajwttoken",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 2: Token with only one dot (incomplete JWT structure)
  await TestValidator.error(
    "should reject token with incomplete JWT structure (one dot only)",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "header.payload",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 3: Token with too many dots (malformed JWT)
  await TestValidator.error(
    "should reject token with too many dots",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "header.payload.signature.extra",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 4: Empty token string
  await TestValidator.error("should reject empty token string", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoListGuest.IRefresh,
    });
  });

  // Test 5: Token with invalid base64 characters
  await TestValidator.error(
    "should reject token with invalid base64 characters",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "header!!!.payload###.signature$$",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 6: Very short invalid token
  await TestValidator.error(
    "should reject very short invalid token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "x.y",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 7: Token with only whitespace
  await TestValidator.error(
    "should reject token with only whitespace",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "   ",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 8: Corrupted JWT-like token (valid structure but corrupted payload)
  await TestValidator.error(
    "should reject corrupted token with invalid encoding",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token:
            RandomGenerator.alphaNumeric(20) +
            "." +
            RandomGenerator.alphaNumeric(20) +
            "." +
            RandomGenerator.alphaNumeric(20),
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
