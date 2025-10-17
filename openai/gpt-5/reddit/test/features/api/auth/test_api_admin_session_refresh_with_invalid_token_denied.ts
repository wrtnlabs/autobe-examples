import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import type { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";

export async function test_api_admin_session_refresh_with_invalid_token_denied(
  connection: api.IConnection,
) {
  /**
   * Validate that the administrator refresh endpoint rejects invalid tokens.
   *
   * Steps:
   *
   * 1. Create an unauthenticated connection object (without touching the original
   *    headers).
   * 2. Try several invalid refresh tokens using the correct DTO shape.
   * 3. Assert that each attempt results in an error (business rejection), without
   *    asserting specific HTTP status codes or error messages.
   */

  // 1) Create a fresh unauthenticated connection (allowed pattern: replace headers object only)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Prepare a set of clearly invalid/expired/malformed token strings
  const invalidTokens: string[] = [
    "", // empty string – still type-correct but business-invalid
    "invalid_refresh_token",
    "not.a.jwt",
    `${RandomGenerator.alphaNumeric(32)}.${RandomGenerator.alphaNumeric(16)}.${RandomGenerator.alphaNumeric(8)}`,
    RandomGenerator.alphaNumeric(64),
  ];

  // 3) Each invalid token must cause an error; never assert status codes
  for (const token of invalidTokens) {
    await TestValidator.error(
      `invalid admin refresh token should be denied: ${token.substring(0, 16)}`,
      async () => {
        await api.functional.auth.adminUser.refresh(unauthConn, {
          body: {
            refresh_token: token,
          } satisfies ICommunityPlatformAdminUserRefresh.ICreate,
        });
      },
    );
  }
}
