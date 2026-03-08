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
  // Step 1: Create initial guest session to obtain valid refresh token
  const initialGuestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(initialGuestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(initialSession);
  const originalRefreshToken = initialSession.refresh;
  const originalAccess = initialSession.access;
  const originalExpiredAt = new Date(initialSession.expired_at);
  const originalRefreshableUntil = new Date(
    initialSession.token.refreshable_until,
  );
  // Step 2: Refresh guest session with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedSession = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditLikeGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Step 3: Verify new tokens are different (token rotation)
  TestValidator.notEquals(
    "new access token is different",
    refreshedSession.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "new refresh token is different",
    refreshedSession.refresh,
    originalRefreshToken,
  );
  // Step 4: Verify expiration timestamps are extended
  const newExpiredAt = new Date(refreshedSession.expired_at);
  const newRefreshableUntil = new Date(
    refreshedSession.token.refreshable_until,
  );
  // Access token should be extended by ~2 hours (7200000 ms)
  TestValidator.predicate("access token expiration extended (~2 hours)", () => {
    const diff = newExpiredAt.getTime() - originalExpiredAt.getTime();
    return diff >= 7100000 && diff <= 7300000; // Allow small margin
  });
  // Refresh token should be extended by ~14 days (1209600000 ms)
  TestValidator.predicate(
    "refresh token expiration extended (~14 days)",
    () => {
      const diff =
        newRefreshableUntil.getTime() - originalRefreshableUntil.getTime();
      return diff >= 1200000000 && diff <= 1220000000; // Allow small margin
    },
  );
  // Step 5: Verify new access token works for authenticated request
  // Use a simple authenticated endpoint to verify the token is valid
  // For guest, we can use the refresh endpoint again with the new access token context
  const verifyConnection: api.IConnection = { host: connection.host };
  verifyConnection.headers = {
    authorization: refreshedSession.access,
  };
  const verifySession = await authorize_guest_refresh(verifyConnection, {
    body: {
      refresh_token: refreshedSession.refresh,
    } satisfies IRedditLikeGuest.IRefresh,
  });
  typia.assert(verifySession);
}
