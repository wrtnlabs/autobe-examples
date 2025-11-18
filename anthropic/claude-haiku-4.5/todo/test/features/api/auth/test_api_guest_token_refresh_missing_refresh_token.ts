import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

/**
 * Test guest token refresh with invalid refresh token values.
 *
 * Validates that the guest token refresh endpoint properly rejects requests
 * when the refresh_token field contains invalid or malformed values. The
 * endpoint should return a validation error when the refresh token is invalid
 * and no tokens should be issued.
 *
 * This test ensures:
 *
 * 1. Invalid refresh_token format is rejected
 * 2. Non-existent or expired refresh tokens are rejected
 * 3. The API validates refresh token content and issues no tokens on failure
 */
export async function test_api_guest_token_refresh_missing_refresh_token(
  connection: api.IConnection,
) {
  // Test 1: Attempt refresh with invalid/malformed refresh token
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "invalid-token-format",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 2: Attempt refresh with non-existent refresh token
  await TestValidator.error(
    "non-existent refresh token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: typia
            .random<string & tags.Format<"uuid">>()
            .repeat(10),
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Test 3: Attempt refresh with empty refresh token
  await TestValidator.error(
    "empty refresh token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
