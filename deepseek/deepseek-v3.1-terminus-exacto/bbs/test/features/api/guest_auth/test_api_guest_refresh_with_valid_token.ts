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
 * Test successful guest token refresh with valid refresh token.
 *
 * 1. Create guest session via join endpoint to obtain initial tokens
 * 2. Wait briefly to ensure timestamps can be compared
 * 3. Submit refresh request with valid refresh token
 * 4. Validate new tokens are issued with updated expiration
 * 5. Verify guest ID remains consistent
 * 6. Test old refresh token cannot be reused
 * 7. Verify refreshed access token is valid
 */
export async function test_api_guest_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initial = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(initial);
  // Wait to ensure timestamps can be compared
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 2. Refresh tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initial.token.refresh satisfies string as string,
    } satisfies IDiscussionBoardGuest.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate basic response structure
  TestValidator.equals("guest ID remains consistent", initial.id, refreshed.id);
  TestValidator.equals(
    "device fingerprint matches",
    initial.device_fingerprint,
    refreshed.device_fingerprint,
  );
  // 4. Validate tokens are new and different
  TestValidator.notEquals(
    "access token changed",
    initial.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    initial.token.refresh,
    refreshed.token.refresh,
  );
  // 5. Validate expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(refreshed.token.expired_at);
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // 6. Test old refresh token cannot be reused
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token rejected", async () => {
    await authorize_guest_refresh(oldTokenConnection, {
      body: {
        refresh_token: initial.token.refresh satisfies string as string,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  });
  // 7. Verify refreshed access token exists (cannot test actual endpoint access as none exist)
  TestValidator.predicate(
    "refreshed access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed access token is different format from UUID",
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshed.token.access,
    ),
  );
}
