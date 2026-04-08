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
 * Test multiple consecutive guest session refreshes to validate token rotation and session extension.
 *
 * Validates the complete token refresh workflow including initial guest registration, first refresh operation, and second consecutive refresh operation. Ensures that each refresh returns new unique tokens while maintaining the same guest identity.
 *
 * Special attention is given to verifying token rotation (each refresh generates new access and refresh tokens), session continuity (all tokens reference the same guest id), and timestamp extension (each refresh extends the session validity).
 *
 * 1. Register new guest account with unique device fingerprint via join endpoint.
 * 2. First refresh: Call refresh endpoint with initial refresh token to get second token set.
 * 3. Second refresh: Call refresh endpoint with first refresh token to get third token set.
 * 4. Validate token rotation: All access tokens are unique, all refresh tokens are unique.
 * 5. Validate session continuity: All three responses reference the same guest id.
 * 6. Validate timestamp extension: Each refresh has valid expired_at and refreshable_until timestamps.
 */
export async function test_api_guest_session_refresh_multiple_consecutive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const initialGuest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(initialGuest);
  // 2. First refresh - get second token set
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefresh = await authorize_guest_refresh(firstRefreshConnection, {
    body: {
      refresh_token: initialGuest.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(firstRefresh);
  // 3. Second refresh - get third token set
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_guest_refresh(secondRefreshConnection, {
    body: {
      refresh_token: firstRefresh.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IRefresh,
  });
  typia.assert(secondRefresh);
  // 4. Validate token rotation - all access tokens are unique
  TestValidator.notEquals(
    "access token rotated (initial vs first)",
    initialGuest.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "access token rotated (first vs second)",
    firstRefresh.token.access,
    secondRefresh.token.access,
  );
  TestValidator.notEquals(
    "access token rotated (initial vs second)",
    initialGuest.token.access,
    secondRefresh.token.access,
  );
  // 5. Validate token rotation - all refresh tokens are unique
  TestValidator.notEquals(
    "refresh token rotated (initial vs first)",
    initialGuest.token.refresh,
    firstRefresh.token.refresh,
  );
  TestValidator.notEquals(
    "refresh token rotated (first vs second)",
    firstRefresh.token.refresh,
    secondRefresh.token.refresh,
  );
  TestValidator.notEquals(
    "refresh token rotated (initial vs second)",
    initialGuest.token.refresh,
    secondRefresh.token.refresh,
  );
  // 6. Validate session continuity - same guest id across all refreshes
  TestValidator.equals(
    "guest id consistent (initial vs first)",
    initialGuest.id,
    firstRefresh.id,
  );
  TestValidator.equals(
    "guest id consistent (first vs second)",
    firstRefresh.id,
    secondRefresh.id,
  );
  TestValidator.equals(
    "guest id consistent (initial vs second)",
    initialGuest.id,
    secondRefresh.id,
  );
  // 7. Validate device fingerprint consistency
  TestValidator.equals(
    "device fingerprint consistent",
    initialGuest.device_fingerprint,
    firstRefresh.device_fingerprint,
  );
  TestValidator.equals(
    "device fingerprint consistent",
    firstRefresh.device_fingerprint,
    secondRefresh.device_fingerprint,
  );
  // 8. Validate timestamps are valid date-time format
  TestValidator.predicate(
    "initial expired_at is valid date",
    () => new Date(initialGuest.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "first refresh expired_at is valid date",
    () => new Date(firstRefresh.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "second refresh expired_at is valid date",
    () => new Date(secondRefresh.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "initial refreshable_until is valid date",
    () => new Date(initialGuest.token.refreshable_until).getTime() > 0,
  );
  TestValidator.predicate(
    "first refresh refreshable_until is valid date",
    () => new Date(firstRefresh.token.refreshable_until).getTime() > 0,
  );
  TestValidator.predicate(
    "second refresh refreshable_until is valid date",
    () => new Date(secondRefresh.token.refreshable_until).getTime() > 0,
  );
}
