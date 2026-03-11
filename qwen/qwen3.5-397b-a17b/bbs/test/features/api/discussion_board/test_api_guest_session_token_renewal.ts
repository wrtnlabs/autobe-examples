import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session token renewal to validate continuous anonymous browsing access.
 *
 * This test verifies the complete token refresh workflow:
 * 1. Guest registers to establish initial session with JWT tokens
 * 2. Guest uses refresh token to request session renewal
 * 3. System validates session and generates new credentials
 * 4. New tokens are verified to be different from originals
 */
export async function test_api_guest_session_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Initial guest registration to establish session
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Extract refresh token from initial authorization
  const refreshToken = initialAuth.token.refresh;
  // 3. Create new connection and refresh the session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate guest ID remains the same (same anonymous identity)
  TestValidator.equals("guest ID preserved", initialAuth.id, refreshedAuth.id);
  // 5. Validate new tokens are different (fresh token generation)
  TestValidator.notEquals(
    "access token renewed",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token renewed",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // 6. Validate new expiration times are in the future
  TestValidator.predicate(
    "new access token has future expiration",
    new Date(refreshedAuth.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "new refresh deadline is in future",
    new Date(refreshedAuth.token.refreshable_until).getTime() > Date.now(),
  );
  // 7. Verify refreshable_until is later than expired_at (refresh token outlives access token)
  TestValidator.predicate(
    "refresh deadline after access expiration",
    new Date(refreshedAuth.token.refreshable_until).getTime() >=
      new Date(refreshedAuth.token.expired_at).getTime(),
  );
}
