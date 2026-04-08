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

export async function test_api_guest_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account with initial join
  const joinConnection: api.IConnection = { host: connection.host };
  const guestJoin = await authorize_guest_join(joinConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(guestJoin);
  const oldRefreshToken = guestJoin.token.refresh;
  const oldExpiredAt = guestJoin.token.expired_at;
  const oldRefreshableUntil = guestJoin.token.refreshable_until;
  // 2. Create connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 3. Perform token refresh with valid refresh token
  const guestRefresh = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh: oldRefreshToken,
    } satisfies IEcommerceMallGuest.IRefresh,
  });
  typia.assert(guestRefresh);
  // 4. Validate token rotation - new refresh token differs from old
  TestValidator.notEquals(
    "refresh token rotated",
    oldRefreshToken,
    guestRefresh.token.refresh,
  );
  // 5. Validate new access token is returned
  TestValidator.predicate(
    "new access token exists",
    guestRefresh.token.access.length > 0,
  );
  // 6. Validate access token format (JWT-like: three base64 parts separated by dots)
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  TestValidator.predicate(
    "access token is valid JWT format",
    jwtPattern.test(guestRefresh.token.access),
  );
  // 7. Validate expired_at is in the future (ISO 8601 date-time)
  TestValidator.predicate(
    "access expired_at is in the future",
    new Date(guestRefresh.token.expired_at) > new Date(),
  );
  // 8. Validate expired_at extends from old expiration (new expiration is later or same)
  TestValidator.predicate(
    "access token extended from previous",
    new Date(guestRefresh.token.expired_at) >= new Date(oldExpiredAt),
  );
  // 9. Validate refreshable_until is in the future
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(guestRefresh.token.refreshable_until) > new Date(),
  );
  // 10. Validate refreshable_until extends from old deadline (or remains same for rotation)
  TestValidator.predicate(
    "refreshable_until extends from previous",
    new Date(guestRefresh.token.refreshable_until) >=
      new Date(oldRefreshableUntil),
  );
  // 11. Verify guest ID remains consistent across join and refresh
  TestValidator.equals("guest ID consistent", guestJoin.id, guestRefresh.id);
  // 12. Verify connection headers were updated with new access token
  const authHeader = refreshConnection.headers?.Authorization;
  TestValidator.predicate(
    "connection updated with new access token",
    typeof authHeader === "string" && authHeader.includes(guestRefresh.token.access),
  );
}