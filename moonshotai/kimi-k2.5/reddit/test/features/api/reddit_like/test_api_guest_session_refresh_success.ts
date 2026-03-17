import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(initialSession);
  const oldAccessToken = initialSession.token.access;
  const oldRefreshToken = initialSession.token.refresh;
  const oldExpiredAt = initialSession.token.expired_at;
  const guestId = initialSession.id;
  const deviceFingerprint = initialSession.deviceFingerprint;
  // Step 2: Refresh the session using old refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: {
      token: oldRefreshToken,
    } satisfies IRedditLikeGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Step 3: Verify same guest identity is preserved
  TestValidator.equals(
    "guest ID must remain the same after refresh",
    guestId,
    refreshedSession.id,
  );
  TestValidator.equals(
    "device fingerprint must remain the same",
    deviceFingerprint,
    refreshedSession.deviceFingerprint,
  );
  // Step 4: Verify tokens are rotated (new values)
  TestValidator.notEquals(
    "access token must be rotated",
    oldAccessToken,
    refreshedSession.token.access,
  );
  TestValidator.notEquals(
    "refresh token must be rotated",
    oldRefreshToken,
    refreshedSession.token.refresh,
  );
  TestValidator.notEquals(
    "token expired_at must be updated",
    oldExpiredAt,
    refreshedSession.token.expired_at,
  );
  // Step 5: Verify new token.expired_at is in the future
  const now = new Date();
  const newExpiredAt = new Date(refreshedSession.token.expired_at);
  TestValidator.predicate(
    "token expired_at must be in the future",
    newExpiredAt > now,
  );
  // Step 6: Verify refreshable_until is also in the future
  const refreshableUntil = new Date(refreshedSession.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until must be in the future",
    refreshableUntil > now,
  );
  // Step 7: Verify old refresh token is invalidated (cannot be used again)
  await TestValidator.error(
    "old refresh token must be invalidated after rotation",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_guest_refresh(invalidConnection, {
        body: {
          token: oldRefreshToken,
        } satisfies IRedditLikeGuest.IRefresh,
      });
    },
  );
}
