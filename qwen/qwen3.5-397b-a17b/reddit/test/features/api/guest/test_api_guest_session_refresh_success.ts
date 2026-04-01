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
 * Test successful guest session token refresh using a valid refresh token.
 * 1. Create initial guest account to obtain refresh token
 * 2. Call refresh endpoint with valid refresh token
 * 3. Verify new tokens and extended expiration
 * 4. Validate guest ID consistency across refresh
 * 5. Confirm new access token is set in connection headers
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial guest ID and refresh token
  const initialGuestId = initialAuth.id;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Refresh the session with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Validate guest ID remains consistent
  TestValidator.equals(
    "guest ID consistent after refresh",
    refreshedAuth.id,
    initialGuestId,
  );
  // 4. Validate new tokens are different from initial
  TestValidator.notEquals(
    "access token refreshed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 5. Validate refreshable_until is extended (compare as Date objects)
  TestValidator.predicate(
    "refreshable_until extended",
    new Date(refreshedAuth.token.refreshable_until).getTime() >=
      new Date(initialRefreshableUntil).getTime(),
  );
  // 6. Confirm new access token is set in connection headers
  TestValidator.predicate(
    "new access token in headers",
    refreshConnection.headers?.Authorization !== undefined,
  );
}
