import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Join as guest visitor to establish identity and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(joinConnection, {});
  typia.assert<ICommunityPlatformGuest.IAuthorized>(authorized);
  const firstGuestId = authorized.id;
  const firstAccessToken = authorized.token.access;
  const firstRefreshToken = authorized.token.refresh;
  const firstExpiredAt = authorized.token.expired_at;
  const firstRefreshableUntil = authorized.token.refreshable_until;
  // 2. Refresh the guest session using the refresh token from step 1
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: firstRefreshToken,
    } satisfies ICommunityPlatformGuest.IRefresh,
  });
  typia.assert<ICommunityPlatformGuest.IAuthorized>(refreshed);
  // 3. Validate guest identity is preserved across refresh
  TestValidator.equals("guest id preserved", refreshed.id, firstGuestId);
  // 4. Validate token rotation — old and new tokens must differ
  TestValidator.notEquals("access token rotated", refreshed.token.access, firstAccessToken);
  TestValidator.notEquals("refresh token rotated", refreshed.token.refresh, firstRefreshToken);
  // 5. Validate expiration timestamps are extended
  TestValidator.notEquals("expired at extended", refreshed.token.expired_at, firstExpiredAt);
  TestValidator.notEquals("refreshable until extended", refreshed.token.refreshable_until, firstRefreshableUntil);
}
