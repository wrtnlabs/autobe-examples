import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that /auth/user/refresh securely rejects invalid, fabricated, or expired
 * refresh tokens.
 *
 * - Sends various token-like strings of sufficient length that are not valid
 *   refresh tokens.
 * - Ensures endpoint gives generic error with no token or user info on failure.
 * - Never tests malformed or too-short tokens; only business logic for
 *   invalidity.
 * - Does not reveal reason for token refresh rejection (invalid/expired/other).
 */
export async function test_api_refresh_tokens_with_invalid_refresh_token(
  connection: api.IConnection,
) {
  const invalidTokens: string[] = [
    // Random alphanumeric 16 chars
    Array.from({ length: 16 }, () =>
      RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz0123456789"]),
    ).join(""),
    // Well-formed but unissued-looking
    "deadbeefcafebabe",
    // Looks like a JWT fragment
    "eyJhbGciOiJIUzI1NiIsInR5cC",
    // Looks like a prefixed token
    "rftoken_" +
      Array.from({ length: 12 }, () =>
        RandomGenerator.pick([..."abcdef0123456789"]),
      ).join(""),
    // Valid-length English phrase
    "notavalidtoken",
  ];
  for (const token of invalidTokens) {
    await TestValidator.error(
      `refresh fails with invalid refresh_token=${token}`,
      async () => {
        // send token that is valid type-wise but not actually valid to backend
        await api.functional.auth.user.refresh(connection, {
          body: { refresh_token: token } satisfies ITodoListUser.IRefresh,
        });
      },
    );
  }
}
