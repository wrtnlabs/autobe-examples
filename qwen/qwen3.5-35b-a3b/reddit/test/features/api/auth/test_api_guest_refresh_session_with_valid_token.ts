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

export async function test_api_guest_refresh_session_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account (will return refresh token)
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(initialAuth);
  // 2. Refresh session with the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    },
  });
  typia.assert(refreshedAuth);
  // 3. Validate response includes correct guest ID (same account)
  TestValidator.equals("guest ID matches", refreshedAuth.id, initialAuth.id);
  // 4. Validate new access token was issued
  TestValidator.notEquals(
    "access token refreshed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  // 5. Validate new refresh token was issued
  TestValidator.notEquals(
    "refresh token refreshed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 6. Validate access token expiration was extended (ISO date strings can be compared lexicographically)
  TestValidator.predicate(
    "access expiration extended",
    refreshedAuth.token.expired_at > initialAuth.token.expired_at,
  );
  // 7. Validate refresh token deadline was extended
  TestValidator.predicate(
    "refresh deadline extended",
    refreshedAuth.token.refreshable_until > initialAuth.token.refreshable_until,
  );
}
