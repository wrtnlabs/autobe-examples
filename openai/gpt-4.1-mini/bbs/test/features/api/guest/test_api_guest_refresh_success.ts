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
 * Test the guest token refresh process using a valid refresh token obtained from a prior guest join operation.
 * Verify that the response includes new access and refresh tokens with correct expiration metadata.
 * Validate that the refreshed tokens enable continued stateless session access without requiring re-login or join.
 * Confirm security by ensuring the tokens are JWTs and the token expiry timestamps are properly updated.
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Join as guest to obtain initial tokens
  const joinBody = {
    deviceFingerprint: RandomGenerator.alphaNumeric(16),
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    ipAddress: "127.0.0.1",
    anonymousId: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardGuest.IJoin;
  const joined = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  // Store the initial refresh token
  const initialRefreshToken: string = joined.token.refresh;
  // 2. Refresh token using the obtained refresh token
  const refreshBody = {
    refreshToken: initialRefreshToken,
  } satisfies IDiscussionBoardGuest.IRefresh;
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: refreshBody,
  });
  typia.assert(refreshed);
  // 3. Validate the refreshed tokens differ from the initial ones
  TestValidator.notEquals(
    "refresh token changed",
    refreshed.token.refresh,
    initialRefreshToken,
  );
  TestValidator.predicate(
    "access token is JWT",
    /^eyJ[A-Za-z0-9-_]+\.?([A-Za-z0-9-_]+\.?){1,2}[A-Za-z0-9-_]+$/.test(
      refreshed.token.access,
    ),
  );
  TestValidator.predicate(
    "refresh token is JWT",
    /^eyJ[A-Za-z0-9-_]+\.?([A-Za-z0-9-_]+\.?){1,2}[A-Za-z0-9-_]+$/.test(
      refreshed.token.refresh,
    ),
  );
  // 4. Validate expiry timestamps are updated (refreshed token expires later than now)
  const now = new Date();
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate("access token expiry is future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expiry is future",
    refreshableUntil > now,
  );
  // 5. Use refreshed token to confirm continued stateless session access
  const newGuestConnection: api.IConnection = { host: connection.host };
  newGuestConnection.headers = { Authorization: refreshed.token.access };
  // Confirm we can do another refresh without re-joining
  const refreshAgain = await authorize_guest_refresh(newGuestConnection, {
    body: {
      refreshToken: refreshed.token.refresh,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshAgain);
  TestValidator.notEquals(
    "refresh again token changed",
    refreshAgain.token.refresh,
    refreshed.token.refresh,
  );
}
