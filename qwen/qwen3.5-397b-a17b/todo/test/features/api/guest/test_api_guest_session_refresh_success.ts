import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish initial guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(16);
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Verify initial session is valid
  TestValidator.predicate(
    "guest account is active",
    initialAuth.deleted_at === null,
  );
  TestValidator.equals(
    "device fingerprint preserved",
    initialAuth.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate("has sessions", initialAuth.sessions.length > 0);
  // 3. Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  // 4. Refresh the guest session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 5. Validate refreshed session
  TestValidator.predicate(
    "guest account remains active",
    refreshedAuth.deleted_at === null,
  );
  TestValidator.equals(
    "device fingerprint preserved after refresh",
    refreshedAuth.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals("guest id unchanged", refreshedAuth.id, initialAuth.id);
  // 6. Verify token rotation - new tokens must be different
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 7. Verify new session has extended expiration
  TestValidator.predicate(
    "new expired_at is later",
    new Date(refreshedAuth.token.expired_at) > new Date(originalExpiredAt),
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // 8. Verify new session was created
  TestValidator.predicate(
    "has sessions after refresh",
    refreshedAuth.sessions.length > 0,
  );
}
