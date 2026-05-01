import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh with valid refresh token from prior join.
 *
 * Validates that a guest can successfully extend their session by exchanging a valid refresh token for a new JWT token pair. The refresh token is obtained from a prior join operation, and the new session preserves the guest identity while issuing distinct tokens.
 *
 * 1. Join creates a guest identity with device fingerprint and returns initial tokens.
 * 2. Refresh exchanges the initial refresh token for a new token pair.
 * 3. Validates identity preservation: id, fingerprint, created_at, and updated_at unchanged.
 * 4. Validates token rotation: new access and refresh tokens differ from originals and are non-empty.
 * 5. Validates expiration chronology: expired_at and refreshable_until are future dates, with refreshable_until after expired_at.
 */
export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join: create guest identity and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {});
  typia.assert(joinResponse);
  // 2. Refresh: exchange the initial refresh token for a new token pair
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: joinResponse.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 3. Validate identity preservation
  TestValidator.equals(
    "guest id preserved",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "fingerprint preserved",
    refreshResponse.fingerprint,
    joinResponse.fingerprint,
  );
  TestValidator.equals(
    "created_at unchanged",
    refreshResponse.created_at,
    joinResponse.created_at,
  );
  TestValidator.equals(
    "updated_at reflects join time, not refreshed",
    refreshResponse.updated_at,
    joinResponse.updated_at,
  );
  // 4. Validate token rotation
  TestValidator.notEquals(
    "new access token distinct",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token distinct",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  TestValidator.predicate(
    "new access token non-empty",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token non-empty",
    refreshResponse.token.refresh.length > 0,
  );
  // 5. Validate expiration chronology
  const now = new Date();
  const expiredAt = new Date(refreshResponse.token.expired_at);
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
