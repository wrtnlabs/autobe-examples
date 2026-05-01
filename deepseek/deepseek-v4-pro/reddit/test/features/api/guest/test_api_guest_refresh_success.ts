import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh with valid refresh token.
 *
 * Validates that a guest who has established a session via join can successfully refresh their session by exchanging a valid refresh token for a new access token and refresh token pair. The test verifies token rotation, identity preservation, and updated expiration timestamps.
 *
 * 1. Guest joins to establish a session and obtain initial tokens.
 * 2. Guest calls refresh with the initial refresh token.
 * 3. Validates that a new access token is issued.
 * 4. Validates that the new refresh token differs from the submitted one.
 * 5. Validates that guest identity (id, fingerprint) is preserved.
 * 6. Validates that expiration timestamps are updated and extended.
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session via join
  const joinConnection: api.IConnection = { host: connection.host };
  const initialResult = await authorize_guest_join(joinConnection, {});
  typia.assert(initialResult);
  const oldRefreshToken = initialResult.token.refresh;
  // 2. Refresh session with the initial refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedResult = await authorize_guest_refresh(refreshConnection, {
    body: { refresh: oldRefreshToken },
  });
  typia.assert(refreshedResult);
  // 3. Validate new access token exists
  TestValidator.predicate(
    "new access token is issued",
    refreshedResult.token.access.length > 0,
  );
  // 4. Validate refresh token rotated
  TestValidator.notEquals(
    "refresh token is different from the submitted one",
    refreshedResult.token.refresh,
    oldRefreshToken,
  );
  // 5. Validate guest identity preserved
  TestValidator.equals(
    "guest id preserved across refresh",
    refreshedResult.id,
    initialResult.id,
  );
  TestValidator.equals(
    "fingerprint preserved across refresh",
    refreshedResult.fingerprint,
    initialResult.fingerprint,
  );
  // 6. Validate expiration timestamps updated
  TestValidator.predicate(
    "new expired_at is after old expired_at",
    () =>
      new Date(refreshedResult.token.expired_at) >
      new Date(initialResult.token.expired_at),
  );
  TestValidator.predicate(
    "new refreshable_until is after old refreshable_until",
    () =>
      new Date(refreshedResult.token.refreshable_until) >
      new Date(initialResult.token.refreshable_until),
  );
}
