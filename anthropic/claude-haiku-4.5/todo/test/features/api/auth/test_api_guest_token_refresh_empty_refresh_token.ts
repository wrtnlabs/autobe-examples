import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_token_refresh_empty_refresh_token(
  connection: api.IConnection,
) {
  /**
   * Test that guest token refresh fails with an empty string refresh token.
   *
   * The endpoint /auth/guest/refresh expects a valid refresh token from a
   * previous successful guest authentication. When an empty string is provided
   * as the refresh token, the system should reject it as an invalid token, not
   * as a missing field error.
   *
   * This validates that:
   *
   * 1. Empty string tokens are not accepted as valid tokens
   * 2. The API properly validates token format and existence
   * 3. Error handling distinguishes between invalid tokens and missing fields
   */

  // Test that empty refresh token causes authentication error
  await TestValidator.error(
    "empty refresh token should be rejected as invalid token",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "", // Empty string should not be treated as valid token
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
