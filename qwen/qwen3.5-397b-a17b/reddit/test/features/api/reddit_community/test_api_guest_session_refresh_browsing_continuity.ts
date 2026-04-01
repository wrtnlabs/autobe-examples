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

/**
 * Test guest session refresh maintains browsing continuity across token renewal.
 * 1. Create guest account via join endpoint
 * 2. Store initial guest ID and refresh token
 * 3. Refresh session to obtain new tokens
 * 4. Verify guest ID remains the same (identity preserved)
 * 5. Verify tokens are rotated (new access and refresh tokens)
 * 6. Validate token structure and expiration timestamps
 */
export async function test_api_guest_session_refresh_browsing_continuity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest account
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const joinConnection: api.IConnection = { host: connection.host };
  const initialGuest: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(joinConnection, {
      body: {
        deviceFingerprint: deviceFingerprint,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(initialGuest);
  // 2. Store original guest ID and tokens for comparison
  const originalGuestId = initialGuest.id;
  const originalAccessToken = initialGuest.token.access;
  const originalRefreshToken = initialGuest.token.refresh;
  const originalExpiredAt = initialGuest.token.expired_at;
  const originalRefreshableUntil = initialGuest.token.refreshable_until;
  // 3. Refresh session to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedGuest: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(refreshedGuest);
  // 4. Verify guest ID remains the same (identity preserved across refresh)
  TestValidator.equals(
    "guest ID preserved after refresh",
    refreshedGuest.id,
    originalGuestId,
  );
  // 5. Verify tokens are rotated (new access and refresh tokens issued)
  TestValidator.notEquals(
    "access token rotated",
    refreshedGuest.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedGuest.token.refresh,
    originalRefreshToken,
  );
  // 6. Validate token structure and expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => new Date(initialGuest.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => new Date(initialGuest.token.refreshable_until).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () =>
      new Date(initialGuest.token.refreshable_until).getTime() >=
      new Date(initialGuest.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshed expired_at is valid date-time",
    () => new Date(refreshedGuest.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is valid date-time",
    () => new Date(refreshedGuest.token.refreshable_until).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is after expired_at",
    () =>
      new Date(refreshedGuest.token.refreshable_until).getTime() >=
      new Date(refreshedGuest.token.expired_at).getTime(),
  );
  // 7. Verify refreshed session has extended or equal validity
  TestValidator.predicate(
    "refreshed session maintains validity period",
    () =>
      new Date(refreshedGuest.token.refreshable_until).getTime() >=
      new Date(originalRefreshableUntil).getTime(),
  );
}
