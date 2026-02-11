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

export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialJoin: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(initialJoin);
  // 2. Prepare refresh request with the obtained refresh token
  const refreshRequest: IRedditCommunityGuest.IRefresh = {
    refresh_token: initialJoin.refresh,
  };
  // 3. Refresh the guest session
  const refreshed: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: refreshRequest,
    });
  typia.assert(refreshed);
  // 4. Validate that new tokens were issued
  TestValidator.notEquals(
    "new access token differs from old",
    initialJoin.access,
    refreshed.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    initialJoin.refresh,
    refreshed.refresh,
  );
  // Validate access token expiration is updated (should be 15 minutes from now)
  const now = new Date();
  const newAccessExpires = new Date(refreshed.token.expired_at);
  TestValidator.predicate(
    "new access token expires near future",
    newAccessExpires.getTime() - now.getTime() >= 14 * 60 * 1000 &&
      newAccessExpires.getTime() - now.getTime() <= 15 * 60 * 1000,
  );
  // Validate refresh token extends expiration significantly (7 days)
  const newRefreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "new refresh token expires far in the future",
    newRefreshableUntil.getTime() - now.getTime() >= 6 * 24 * 60 * 60 * 1000,
  ); // > 6 days
  // 5. Validate that old refresh token is rejected (revocation check)
  await TestValidator.error("old refresh token is revoked", async () => {
    const revokedConnection: api.IConnection = { host: connection.host };
    await authorize_guest_refresh(revokedConnection, {
      body: refreshRequest,
    });
  });
}
