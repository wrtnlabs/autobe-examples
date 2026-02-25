import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
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
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {
    body: {} satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(initialSession);
  // 2. Prepare refresh request with valid refresh token
  const refreshRequest: IRedditCommunityGuest.IRefresh = {
    refreshToken: initialSession.token.refresh,
  };
  // 3. Refresh the session
  const refreshedSession = await authorize_guest_refresh(guestConnection, {
    body: refreshRequest,
  });
  typia.assert(refreshedSession);
  // 4. Validate that new tokens were issued
  TestValidator.notEquals(
    "new access token different from old",
    initialSession.token.access,
    refreshedSession.token.access,
  );
  TestValidator.notEquals(
    "new refresh token different from old",
    initialSession.token.refresh,
    refreshedSession.token.refresh,
  );
  // 5. Validate expiration timestamps are extended
  const oldExpiredAt = new Date(initialSession.token.expired_at);
  const newExpiredAt = new Date(refreshedSession.token.expired_at);
  TestValidator.predicate(
    "new access token has extended expiration",
    newExpiredAt > oldExpiredAt,
  );
  const oldRefreshableUntil = new Date(initialSession.token.refreshable_until);
  const newRefreshableUntil = new Date(
    refreshedSession.token.refreshable_until,
  );
  TestValidator.predicate(
    "new refresh token has extended refreshable until",
    newRefreshableUntil > oldRefreshableUntil,
  );
  // 6. Verify the new access token works for subsequent requests
  const checkConnection: api.IConnection = { host: connection.host };
  // The authorize_guest_refresh function automatically sets the Authorization header
  // Verify we can make a request with the new token
  const guestProfile = await api.functional.redditCommunity.auth.guest.join(
    checkConnection,
    {
      body: {} satisfies IRedditCommunityGuest.IJoin,
    },
  );
  typia.assert(guestProfile);
  // 7. Validate the OLD refresh token is now invalidated (CRITICAL)
  await TestValidator.error(
    "old refresh token rejected after refresh",
    async () => {
      await authorize_guest_refresh(guestConnection, {
        body: {
          refreshToken: initialSession.token.refresh,
        } satisfies IRedditCommunityGuest.IRefresh,
      });
    },
  );
}
