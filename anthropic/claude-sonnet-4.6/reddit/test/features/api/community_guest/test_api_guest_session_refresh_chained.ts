import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_chained(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish initial guest identity via join
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {});
  typia.assert(joined);
  // Step 2: Refresh the guest session using the refresh token from step 1
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies ICommunityGuest.IRefresh,
  });
  typia.assert(refreshed);
  // Validation 1: Guest identity persists — same id across join and refresh
  TestValidator.equals(
    "guest id persists after refresh",
    refreshed.id,
    joined.id,
  );
  // Validation 2: Fingerprint remains consistent
  TestValidator.equals(
    "fingerprint persists after refresh",
    refreshed.fingerprint,
    joined.fingerprint,
  );
  // Validation 3: Token rotation — new access token must differ from the old one
  TestValidator.notEquals(
    "access token rotated",
    refreshed.token.access,
    joined.token.access,
  );
  // Validation 4: Token rotation — new refresh token must differ from the old one
  TestValidator.notEquals(
    "refresh token rotated",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  // Validation 5: New access token expiry is in the future
  TestValidator.predicate(
    "new expired_at is in the future",
    new Date(refreshed.token.expired_at) > new Date(),
  );
  // Validation 6: New refreshable_until is in the future
  TestValidator.predicate(
    "new refreshable_until is in the future",
    new Date(refreshed.token.refreshable_until) > new Date(),
  );
}
