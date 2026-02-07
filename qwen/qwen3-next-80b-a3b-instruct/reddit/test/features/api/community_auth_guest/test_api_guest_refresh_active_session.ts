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

export async function test_api_guest_refresh_active_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session via join
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityGuest.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Extract refresh token from join response
  const refreshToken = joinResponse.token.refresh;
  // 3. Set the Authorization header with the refresh token for the refresh operation
  // According to the API spec and connection header usage pattern, the refresh token is passed in the Authorization header
  const refreshConnection: api.IConnection = { host: connection.host };
  refreshConnection.headers = { Authorization: `Bearer ${refreshToken}` };
  // 4. Refresh the session using the authenticated connection
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {} satisfies ICommunityGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 5. Validate: New access and refresh tokens are issued
  TestValidator.equals(
    "new access token exists",
    refreshResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token exists",
    refreshResponse.token.refresh.length > 0,
    true,
  );
  // 6. Validate: Refresh token is different from original (it should be refreshed)
  TestValidator.notEquals(
    "refresh token changed",
    joinResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  // 7. Validate: Expiration times are extended by 30 minutes
  const originalExpiresAt = new Date(joinResponse.token.expired_at);
  const newExpiresAt = new Date(refreshResponse.token.expired_at);
  const expirationDifference =
    newExpiresAt.getTime() - originalExpiresAt.getTime();
  const expectedDifference = 30 * 60 * 1000; // 30 minutes in milliseconds
  TestValidator.predicate("expiration extended by ~30 minutes", () => {
    // Allow small clock drift (e.g., < 10 seconds)
    return Math.abs(expirationDifference - expectedDifference) < 10000;
  });
  // 8. Validate: refreshable_until is extended by 30 days
  const originalRefreshableUntil = new Date(
    joinResponse.token.refreshable_until,
  );
  const newRefreshableUntil = new Date(refreshResponse.token.refreshable_until);
  const refreshableDifference =
    newRefreshableUntil.getTime() - originalRefreshableUntil.getTime();
  const expectedRefreshableDifference = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  TestValidator.predicate("refreshable_until extended by ~30 days", () => {
    return (
      Math.abs(refreshableDifference - expectedRefreshableDifference) < 10000
    );
  });
}
