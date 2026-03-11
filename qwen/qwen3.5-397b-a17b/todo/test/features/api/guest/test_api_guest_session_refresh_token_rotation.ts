import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial tokens for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Refresh the session using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshedAuth);
  // 3. Validate new tokens are completely different from originals (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 4. Verify new expired_at is in the future (session extended)
  const newExpiredAt = new Date(refreshedAuth.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "new expired_at is in future",
    () => newExpiredAt > now,
  );
  // 5. Verify refreshable_until maintains or extends the maximum session duration
  const newRefreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  const originalRefreshableUntil = new Date(initialRefreshableUntil);
  TestValidator.predicate(
    "refreshable_until maintained or extended",
    () => newRefreshableUntil >= originalRefreshableUntil,
  );
  // 6. Validate the refreshed response structure
  TestValidator.equals("guest id unchanged", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "device fingerprint unchanged",
    initialAuth.device_fingerprint,
    refreshedAuth.device_fingerprint,
  );
}
