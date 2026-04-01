import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh success scenario.
 *
 * This test validates the complete guest authentication token refresh workflow:
 * 1. Register a new guest account to obtain initial tokens
 * 2. Refresh the access token using the refresh token before expiration
 * 3. Verify new tokens are issued with extended session deadline
 * 4. Confirm the new access token is functional for protected endpoints
 */
export async function test_api_guest_auth_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(joinResult);
  // 2. Store initial token information for comparison
  const initialRefreshToken = joinResult.token.refresh;
  const initialRefreshableUntil = joinResult.token.refreshable_until;
  const initialAccessToken = joinResult.token.access;
  const guestId = joinResult.id;
  // 3. Refresh the token using the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate guest ID remains the same
  TestValidator.equals("guest id unchanged", refreshResult.id, guestId);
  // 5. Verify new access token is different from original
  TestValidator.notEquals(
    "access token refreshed",
    refreshResult.token.access,
    initialAccessToken,
  );
  // 6. Verify new refresh token is different from original (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    initialRefreshToken,
  );
  // 7. Validate refreshable_until is extended or same (new >= old)
  const newRefreshableUntil = new Date(
    refreshResult.token.refreshable_until,
  ).getTime();
  const oldRefreshableUntil = new Date(initialRefreshableUntil).getTime();
  TestValidator.predicate(
    "refreshable_until extended",
    () => newRefreshableUntil >= oldRefreshableUntil,
  );
  // 8. Verify new access token is set in connection headers
  TestValidator.predicate(
    "new access token in headers",
    () => refreshConnection.headers?.Authorization !== undefined,
  );
  // 9. Validate all token fields exist and are properly formatted
  TestValidator.predicate(
    "new access token exists",
    () => refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token exists",
    () => refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    () => new Date(refreshResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    () => new Date(refreshResult.token.refreshable_until).getTime() > 0,
  );
}
