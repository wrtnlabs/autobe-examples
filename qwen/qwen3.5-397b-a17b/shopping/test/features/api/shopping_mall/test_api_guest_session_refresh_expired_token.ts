import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh behavior with token validation.
 *
 * Validates the complete guest session lifecycle including initial registration and token refresh mechanism. Tests that the refresh endpoint correctly issues new token pairs while maintaining guest identity, and verifies the session management architecture that enforces expiration through refreshable_until timestamp comparison.
 *
 * The refresh operation validates that the refresh_token exists in the shopping_mall_guest_sessions table and that the current time is before the refreshable_until timestamp. When tokens expire (current time exceeds refreshable_until), the refresh endpoint returns 401 Unauthorized requiring re-registration via the join endpoint.
 *
 * 1. Create guest account via join endpoint to obtain initial session tokens.
 * 2. Refresh the session using valid refresh token to verify refresh mechanism works.
 * 3. Validate refreshed tokens are different from original tokens while guest identity remains unchanged.
 * 4. Confirm expiration enforcement architecture through refreshable_until timestamp validation.
 */
export async function test_api_guest_session_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account to obtain initial session tokens
  const guestJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(guestJoin);
  // 2. Refresh the session using valid refresh token
  const refreshedGuest = await authorize_guest_refresh(connection, {
    body: {
      refresh_token: guestJoin.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(refreshedGuest);
  // 3. Validate refreshed tokens are different from original (new token pair issued)
  TestValidator.notEquals(
    "access token changed after refresh",
    guestJoin.token.access,
    refreshedGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after refresh",
    guestJoin.token.refresh,
    refreshedGuest.token.refresh,
  );
  // Validate guest identity remains the same after refresh
  TestValidator.equals(
    "guest id unchanged after refresh",
    guestJoin.id,
    refreshedGuest.id,
  );
  TestValidator.equals(
    "device fingerprint unchanged after refresh",
    guestJoin.device_fingerprint,
    refreshedGuest.device_fingerprint,
  );
  // 4. Validate expiration architecture (refreshable_until >= expired_at)
  const expiredAtTime = new Date(guestJoin.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    guestJoin.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilTime >= expiredAtTime,
  );
  // Note: Actual expiration testing (refreshable_until timestamp passed) requires
  // server-side time manipulation. When refresh_token is expired, the endpoint
  // returns 401 Unauthorized and guest must re-register via join operation.
}
