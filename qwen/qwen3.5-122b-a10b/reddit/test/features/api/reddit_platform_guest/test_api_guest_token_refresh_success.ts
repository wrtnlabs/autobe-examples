import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account with device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Store original token info for comparison
  const originalRefreshToken = guestAuth.token.refresh;
  const originalId = guestAuth.id;
  const originalCreatedAt = guestAuth.created_at;
  // 3. Refresh the token using the refresh token
  const refreshedAuth = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditPlatformGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate the refresh response
  TestValidator.equals("guest id unchanged", refreshedAuth.id, originalId);
  TestValidator.equals(
    "device fingerprint unchanged",
    refreshedAuth.device_fingerprint,
    guestAuth.device_fingerprint,
  );
  TestValidator.equals(
    "created at unchanged",
    refreshedAuth.created_at,
    originalCreatedAt,
  );
  // 5. Validate new tokens are different from original
  TestValidator.notEquals(
    "new access token",
    refreshedAuth.token.access,
    guestAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // 6. Validate token structure
  TestValidator.predicate(
    "access token exists",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshedAuth.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      refreshedAuth.token.refreshable_until,
    ),
  );
}
