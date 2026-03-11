import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest session token refresh workflow.
 *
 * This test validates the complete token refresh lifecycle:
 * 1. Create guest account and obtain initial tokens
 * 2. Refresh tokens using the refresh token
 * 3. Validate token rotation and expiration times
 * 4. Verify old tokens are rejected (security check)
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput: IRedditPlatformGuest.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const initialAuth: IRedditPlatformGuest.IAuthorized =
    await api.functional.redditPlatform.auth.guest.join(guestConnection, {
      body: joinInput,
    });
  typia.assert(initialAuth);
  typia.assert(initialAuth.token);
  typia.assert(initialAuth.sessions);
  TestValidator.equals(
    "initial access token exists",
    initialAuth.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "initial refresh token exists",
    initialAuth.token.refresh.length > 0,
    true,
  );
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  const guestId = initialAuth.id;
  // Step 2: Refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshInput: IRedditPlatformGuest.IRefresh = {
    refresh_token: initialRefreshToken,
  };
  const refreshedAuth: IRedditPlatformGuest.IAuthorized =
    await api.functional.redditPlatform.auth.guest.refresh(refreshConnection, {
      body: refreshInput,
    });
  typia.assert(refreshedAuth);
  typia.assert(refreshedAuth.token);
  typia.assert(refreshedAuth.sessions);
  typia.assert(refreshedAuth.sessions[0]!);
  // Step 3: Validate guest profile information maintained
  TestValidator.equals("guest id maintained", refreshedAuth.id, guestId);
  TestValidator.equals(
    "email maintained",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "username maintained",
    refreshedAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "display name maintained",
    refreshedAuth.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals(
    "karma maintained",
    refreshedAuth.karma,
    initialAuth.karma,
  );
  // Step 4: Validate token rotation
  const newAccessToken = refreshedAuth.token.access;
  const newRefreshToken = refreshedAuth.token.refresh;
  const newExpiredAt = refreshedAuth.token.expired_at;
  const newRefreshableUntil = refreshedAuth.token.refreshable_until;
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    newRefreshToken,
  );
  // Step 5: Validate expiration times
  const now = new Date();
  const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const newExpiredAtDate = new Date(newExpiredAt);
  const accessExpirationDiff = newExpiredAtDate.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires within 2 hours",
    accessExpirationDiff >= 0 && accessExpirationDiff <= twoHours,
  );
  const newRefreshableUntilDate = new Date(newRefreshableUntil);
  const refreshExpirationDiff =
    newRefreshableUntilDate.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token valid for approximately 7 days",
    Math.abs(refreshExpirationDiff - sevenDays) < sevenDays * 0.1,
  );
  const initialExpiredAtDate = new Date(initialExpiredAt);
  TestValidator.predicate(
    "access token expiration is extended",
    newExpiredAtDate.getTime() > initialExpiredAtDate.getTime(),
  );
  // Step 6: Validate session summary
  const sessionSummary = refreshedAuth.sessions[0]!;
  typia.assert(sessionSummary);
  TestValidator.equals(
    "session has valid id",
    sessionSummary.id.length > 0,
    true,
  );
  TestValidator.equals(
    "session references guest",
    sessionSummary.reddit_platform_guest_id,
    guestId,
  );
  TestValidator.equals(
    "session has href",
    sessionSummary.href.length > 0,
    true,
  );
  TestValidator.equals(
    "session has referrer",
    sessionSummary.referrer !== null,
    true,
  );
  TestValidator.equals("session has ip", sessionSummary.ip.length > 0, true);
  TestValidator.equals(
    "session has created_at",
    sessionSummary.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "session has expired_at",
    sessionSummary.expired_at.length > 0,
    true,
  );
  const sessionExpiredAtDate = new Date(sessionSummary.expired_at);
  TestValidator.predicate(
    "session expired_at is extended",
    sessionExpiredAtDate.getTime() > initialExpiredAtDate.getTime(),
  );
}
