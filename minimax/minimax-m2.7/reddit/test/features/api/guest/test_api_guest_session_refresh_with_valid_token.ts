import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session to obtain refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const initialSession = await authorize_guest_join(guestConnection, {});
  typia.assert(initialSession);
  // Extract the refresh token from initial session
  const refreshToken = initialSession.token.refresh;
  const originalGuestId = initialSession.id;
  const originalAccessToken = initialSession.token.access;
  const originalRefreshToken = initialSession.token.refresh;
  const originalExpiredAt = initialSession.token.expired_at;
  const originalRefreshableUntil = initialSession.token.refreshable_until;
  // Step 2: Refresh the guest session using the valid refresh token
  const refreshedSession = await authorize_guest_refresh(guestConnection, {
    body: {
      refreshToken: refreshToken,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(refreshedSession);
  // Step 3: Validate the refreshed session
  // Guest ID should remain the same
  TestValidator.equals(
    "guest_id preserved",
    refreshedSession.id,
    originalGuestId,
  );
  // Access token should be different (new token issued)
  TestValidator.notEquals(
    "new access token issued",
    refreshedSession.token.access,
    originalAccessToken,
  );
  // Refresh token should be different (new token issued)
  TestValidator.notEquals(
    "new refresh token issued",
    refreshedSession.token.refresh,
    originalRefreshToken,
  );
  // Validate token structure exists
  TestValidator.predicate(
    "access token exists",
    refreshedSession.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshedSession.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    !!refreshedSession.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    !!refreshedSession.token.refreshable_until,
  );
}
