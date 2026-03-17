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
 * Test that refreshing a guest session properly extends the expiration time.
 *
 * This test validates the session persistence business logic by:
 * 1. Creating a guest account with initial refresh token
 * 2. Waiting briefly to ensure time progression
 * 3. Refreshing the session multiple times
 * 4. Verifying each refresh extends both expired_at and refreshable_until timestamps
 *
 * The goal is to confirm that active guests browsing the platform can maintain
 * continuous access through session refreshes.
 */
export async function test_api_guest_refresh_session_extends_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const initialGuest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialGuest);
  const initialExpiredAt = initialGuest.token.expired_at;
  const initialRefreshableUntil = initialGuest.token.refreshable_until;
  // 2. Wait briefly to ensure time progression
  await new Promise((resolve) => setTimeout(resolve, 3000));
  // 3. First refresh
  const firstRefresh = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: initialGuest.token.refresh,
    },
  });
  typia.assert(firstRefresh);
  const firstExpiredAt = firstRefresh.token.expired_at;
  const firstRefreshableUntil = firstRefresh.token.refreshable_until;
  // 4. Second refresh
  const secondRefresh = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: firstRefresh.token.refresh,
    },
  });
  typia.assert(secondRefresh);
  const secondExpiredAt = secondRefresh.token.expired_at;
  const secondRefreshableUntil = secondRefresh.token.refreshable_until;
  // 5. Validate timestamps are extended (ISO 8601 strings are sortable)
  TestValidator.equals(
    "first expired_at after initial",
    firstExpiredAt,
    firstExpiredAt,
  );
  TestValidator.equals(
    "first refreshable_until after initial",
    firstRefreshableUntil,
    firstRefreshableUntil,
  );
  TestValidator.equals(
    "second expired_at after first",
    secondExpiredAt,
    secondExpiredAt,
  );
  TestValidator.equals(
    "second refreshable_until after first",
    secondRefreshableUntil,
    secondRefreshableUntil,
  );
  // 6. Validate timestamp progression using predicate (string comparison for ISO 8601)
  TestValidator.predicate(
    "first refresh extends expired_at",
    () => firstExpiredAt > initialExpiredAt,
  );
  TestValidator.predicate(
    "first refresh extends refreshable_until",
    () => firstRefreshableUntil > initialRefreshableUntil,
  );
  TestValidator.predicate(
    "second refresh extends expired_at",
    () => secondExpiredAt > firstExpiredAt,
  );
  TestValidator.predicate(
    "second refresh extends refreshable_until",
    () => secondRefreshableUntil > firstRefreshableUntil,
  );
  // 7. Validate all timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "initial expired_at is in future",
    () => new Date(initialExpiredAt) > now,
  );
  TestValidator.predicate(
    "first expired_at is in future",
    () => new Date(firstExpiredAt) > now,
  );
  TestValidator.predicate(
    "second expired_at is in future",
    () => new Date(secondExpiredAt) > now,
  );
}
