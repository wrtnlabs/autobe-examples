import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_session_extension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and get initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      user_agent: null,
    },
  });
  typia.assert(initialAuth);
  // Store initial token information
  const initialRefreshToken = initialAuth.token.refresh;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  typia.assert(initialRefreshToken);
  typia.assert(initialRefreshableUntil);
  // 2. First refresh - use the initial refresh token
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_guest_refresh(refreshConnection1, {
    body: {
      refresh_token: initialRefreshToken,
    },
  });
  typia.assert(firstRefresh);
  // Verify first refresh response
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    initialAuth.token.refresh,
    firstRefresh.token.refresh,
  );
  const firstRefreshToken = firstRefresh.token.refresh;
  const firstRefreshableUntil = firstRefresh.token.refreshable_until;
  typia.assert(firstRefreshToken);
  typia.assert(firstRefreshableUntil);
  // 3. Validate expiration times are extended
  TestValidator.predicate(
    "new refreshable_until is after initial",
    new Date(firstRefreshableUntil) > new Date(initialRefreshableUntil),
  );
  // Verify refreshable_until doesn't exceed 7 days from initial creation
  const initialCreated = new Date(initialRefreshableUntil);
  const sevenDaysLater = new Date(
    initialCreated.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refreshable_until within 7 days",
    new Date(firstRefreshableUntil) <= sevenDaysLater,
  );
  // 4. Second refresh - use the new refresh token
  const refreshConnection2: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_guest_refresh(refreshConnection2, {
    body: {
      refresh_token: firstRefreshToken,
    },
  });
  typia.assert(secondRefresh);
  // Verify second refresh also rotates tokens
  TestValidator.notEquals(
    "second refresh rotates access token",
    firstRefresh.token.access,
    secondRefresh.token.access,
  );
  TestValidator.notEquals(
    "second refresh rotates refresh token",
    firstRefresh.token.refresh,
    secondRefresh.token.refresh,
  );
  const secondRefreshToken = secondRefresh.token.refresh;
  const secondRefreshableUntil = secondRefresh.token.refreshable_until;
  typia.assert(secondRefreshToken);
  typia.assert(secondRefreshableUntil);
  // 5. Validate second refresh extension
  TestValidator.predicate(
    "second refreshable_until is after first",
    new Date(secondRefreshableUntil) > new Date(firstRefreshableUntil),
  );
  // Verify second refreshable_until still within 7 days of original creation
  TestValidator.predicate(
    "second refreshable_within 7 days",
    new Date(secondRefreshableUntil) <= sevenDaysLater,
  );
  // 6. Verify all access token expirations are in the future
  TestValidator.predicate(
    "first access token expires in future",
    new Date(firstRefresh.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second access token expires in future",
    new Date(secondRefresh.token.expired_at) > new Date(),
  );
  // 7. Validate token structure completeness
  // Verify all required fields exist with proper format
  TestValidator.predicate(
    "first refresh has valid access token",
    firstRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "first refresh has valid refresh token",
    firstRefresh.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "second refresh has valid access token",
    secondRefresh.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh has valid refresh token",
    secondRefresh.token.refresh.length > 0,
  );
  // 8. Verify ISO 8601 format for timestamps
  TestValidator.predicate(
    "first expired_at is valid ISO 8601",
    !isNaN(new Date(firstRefresh.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "first refreshable_until is valid ISO 8601",
    !isNaN(new Date(firstRefresh.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "second expired_at is valid ISO 8601",
    !isNaN(new Date(secondRefresh.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "second refreshable_until is valid ISO 8601",
    !isNaN(new Date(secondRefresh.token.refreshable_until).getTime()),
  );
}