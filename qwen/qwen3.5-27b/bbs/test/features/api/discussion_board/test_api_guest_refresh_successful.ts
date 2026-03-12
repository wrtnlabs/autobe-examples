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
 * Test successful guest session token refresh workflow.
 * 1. Register a guest via /discussionBoard/auth/guest/join to obtain initial access and refresh tokens
 * 2. Extract the refresh token from the join response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Verify that new access and refresh tokens are returned with fresh expiration times
 * 5. Confirm guest identity UUID remains consistent between join and refresh
 */
export async function test_api_guest_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register guest and obtain initial tokens
  const joinInput = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardGuest.IJoin;
  const joinResult = await api.functional.discussionBoard.auth.guest.join(
    guestConnection,
    { body: joinInput },
  );
  typia.assert(joinResult);
  // 3. Extract refresh token from join response
  const refreshBody = {
    refresh_token: joinResult.token.refresh,
  } satisfies IDiscussionBoardGuest.IRefresh;
  // 4. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 5. Call refresh endpoint with the refresh token
  const refreshResult = await api.functional.discussionBoard.auth.guest.refresh(
    refreshConnection,
    { body: refreshBody },
  );
  typia.assert(refreshResult);
  // 6. Validate response structure and token rotation
  TestValidator.equals("guest ID consistent", refreshResult.id, joinResult.id);
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    joinResult.token.refresh,
  );
  // 7. Validate expiration timestamps are fresh
  const now = new Date();
  const newAccessExpiry = new Date(refreshResult.token.expired_at);
  const newRefreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "access token expires in future",
    newAccessExpiry > now,
  );
  TestValidator.predicate(
    "refresh token valid until in future",
    newRefreshableUntil > now,
  );
  // 8. Validate access token expiration is approximately 15 minutes from now
  const accessExpiryDiff = newAccessExpiry.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expiry within 20 minutes",
    accessExpiryDiff < 20 * 60 * 1000,
  );
  TestValidator.predicate(
    "access token expiry at least 10 minutes",
    accessExpiryDiff > 10 * 60 * 1000,
  );
  // 9. Validate refreshable_until is approximately 30 minutes from now
  const refreshDiff = newRefreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refreshable_until within 35 minutes",
    refreshDiff < 35 * 60 * 1000,
  );
  TestValidator.predicate(
    "refreshable_until at least 25 minutes",
    refreshDiff > 25 * 60 * 1000,
  );
}
