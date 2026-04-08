import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that using a revoked/rotated refresh token returns 401 Unauthorized.
 *
 * Validates the token rotation security mechanism where a refresh token becomes
 * invalid after being used once. This prevents token replay attacks where stolen
 * refresh tokens could be used to gain unauthorized access.
 *
 * The test creates two separate guest sessions, uses the first session's refresh
 * token to obtain new tokens, then attempts to reuse that same refresh token.
 * The second attempt must fail with 401 Unauthorized.
 *
 * 1. Create first guest session to obtain first refresh token.
 * 2. Create second guest session (separate session, different fingerprint).
 * 3. Use first refresh token - should succeed and return new access token.
 * 4. Attempt to use first refresh token again - must fail with 401.
 * 5. Verify error response indicates token has been revoked or is invalid.
 *
 * This security feature ensures that even if a refresh token is intercepted,
 * it cannot be reused after its first use, limiting the window of vulnerability.
 */
export async function test_api_guest_session_refresh_with_revoked_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest session to obtain first refresh token
  const firstGuestSession = await authorize_guest_join(connection, {
    body: {
      fingerprint:
        `test-device-1-${RandomGenerator.alphaNumeric(16)}` as string &
          tags.MinLength<1>,
      href: "https://example.com/page1" as string & tags.Format<"uri">,
      referrer: "https://example.com/referrer" as string & tags.Format<"uri">,
    },
  });
  typia.assert(firstGuestSession);
  const firstRefreshToken = firstGuestSession.token.refresh;
  // 2. Create second guest session with different fingerprint
  const secondGuestSession = await authorize_guest_join(connection, {
    body: {
      fingerprint:
        `test-device-2-${RandomGenerator.alphaNumeric(16)}` as string &
          tags.MinLength<1>,
      href: "https://example.com/page2" as string & tags.Format<"uri">,
      referrer: "https://example.com/referrer2" as string & tags.Format<"uri">,
    },
  });
  typia.assert(secondGuestSession);
  // 3. Use first refresh token - should succeed and return new tokens (token rotation)
  const refreshedSession = await authorize_guest_refresh(connection, {
    body: {
      refreshToken: firstRefreshToken,
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Validate new tokens were issued
  TestValidator.equals(
    "access token renewed",
    refreshedSession.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token renewed",
    refreshedSession.token.refresh.length > 0,
    true,
  );
  TestValidator.notEquals(
    "new refresh token is different from original",
    refreshedSession.token.refresh,
    firstRefreshToken,
  );
  // 4. Attempt to use first refresh token again - must fail with 401
  // The first refresh token has been rotated, so reusing it should return 401 Unauthorized
  await TestValidator.httpError("revoked token returns 401", 401, async () => {
    await authorize_guest_refresh(connection, {
      body: {
        refreshToken: firstRefreshToken,
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
}
