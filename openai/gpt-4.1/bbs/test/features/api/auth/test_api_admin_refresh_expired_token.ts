import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validates denial of admin JWT refresh with an expired or revoked token.
 *
 * Verifies that the system securely rejects attempts to refresh tokens using a
 * refresh token that is either expired or has been revoked, in accordance with
 * security, audit, and JWT rotation policies. The response should NOT include
 * any new token data or admin profile information, and must not expose
 * sensitive details.
 *
 * Steps:
 *
 * 1. Construct an obviously expired or dummy revoked admin refresh token value.
 * 2. Attempt the /auth/admin/refresh API call with this illegitimate token as the
 *    body.refreshToken.
 * 3. Validate that no IDiscussionBoardAdmin.IAuthorized data is returned on
 *    failure—including new JWT or admin info.
 * 4. Assert a security-compliant error response (generic error, no details leak)
 *    is thrown by the API call.
 */
export async function test_api_admin_refresh_expired_token(
  connection: api.IConnection,
) {
  // 1. Compose an obviously expired/invalid refresh token.
  // In this test framework, using a made-up string as refreshToken will simulate expiration/revocation.
  const expiredToken = "eyJhbGciOiJI...invalid.expired...signature";

  // 2. Attempt to refresh tokens with the expired token
  await TestValidator.error(
    "denies refresh with expired or revoked admin token",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refreshToken: expiredToken,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
