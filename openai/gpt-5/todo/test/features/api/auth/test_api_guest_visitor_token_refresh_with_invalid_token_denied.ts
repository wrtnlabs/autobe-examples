import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IClientContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IClientContext";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";

/**
 * Deny refresh on tampered refresh token while preserving success with the
 * original token.
 *
 * This test ensures that the guest token refresh endpoint rejects an invalid or
 * tampered refresh token without issuing new credentials, and that a subsequent
 * refresh using the original valid token still succeeds. The flow mirrors a
 * realistic guest session lifecycle:
 *
 * 1. Register a guest visitor to obtain initial credentials (access/refresh
 *    tokens).
 * 2. Tamper with the refresh token while preserving JWT-like format.
 * 3. Attempt refresh with the tampered token and expect an error (no status
 *    assertion).
 * 4. Attempt refresh again using the original valid refresh token and expect
 *    success.
 * 5. Validate that the authorized actor id remains the same across join and
 *    refresh.
 */
export async function test_api_guest_visitor_token_refresh_with_invalid_token_denied(
  connection: api.IConnection,
) {
  // 1) Register a guest to obtain tokens
  const joined = await api.functional.auth.guestVisitor.join(connection, {
    body: {} satisfies ITodoListGuestVisitor.ICreate,
  });
  typia.assert(joined);

  // 2) Tamper the refresh token while preserving format
  const originalRefresh: string = joined.token.refresh;
  const tamperedRefresh: string = (() => {
    const parts = originalRefresh.split(".");
    if (parts.length >= 3) {
      const sig = parts[2];
      const tweak = sig.length > 0 && sig[sig.length - 1] === "a" ? "b" : "a";
      parts[2] = sig + tweak; // minimally alter signature segment
      return parts.join(".");
    }
    return `${originalRefresh}-tampered`;
  })();

  // 3) Refresh with tampered token must fail (no status code validation)
  await TestValidator.error(
    "refresh with tampered token should be rejected",
    async () => {
      await api.functional.auth.guestVisitor.refresh(connection, {
        body: {
          refreshToken: tamperedRefresh,
          client: {
            userAgent: `e2e/${RandomGenerator.alphaNumeric(8)}`,
            deviceId: RandomGenerator.alphaNumeric(12),
          },
        } satisfies ITodoListGuestVisitor.IRefresh,
      });
    },
  );

  // 4) Refresh with original valid token must succeed
  const refreshed = await api.functional.auth.guestVisitor.refresh(connection, {
    body: {
      refreshToken: originalRefresh,
      client: {
        userAgent: `e2e/${RandomGenerator.alphaNumeric(8)}`,
        deviceId: RandomGenerator.alphaNumeric(12),
      },
    } satisfies ITodoListGuestVisitor.IRefresh,
  });
  typia.assert(refreshed);

  // 5) Identity stays the same across join and refresh
  TestValidator.equals(
    "refreshed actor id matches the joined actor id",
    refreshed.id,
    joined.id,
  );
}
