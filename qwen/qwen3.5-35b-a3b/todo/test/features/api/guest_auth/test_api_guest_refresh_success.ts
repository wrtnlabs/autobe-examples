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

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account to obtain initial refresh token
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialAuth);
  // 2. Capture refresh token from initial response
  const initialRefreshToken = initialAuth.token.refresh;
  const initialGuestId = initialAuth.id;
  const initialFingerprintHash = initialAuth.fingerprint_hash;
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    },
  });
  typia.assert(refreshedAuth);
  // 4. Verify guest identity is preserved across refresh
  TestValidator.equals("guest id preserved", refreshedAuth.id, initialGuestId);
  TestValidator.equals(
    "fingerprint hash preserved",
    refreshedAuth.fingerprint_hash,
    initialFingerprintHash,
  );
  // 5. Verify new tokens exist
  TestValidator.equals(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
    true,
  );
  // 6. Verify new refresh token differs from original (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 7. Verify token expiration timestamps are valid ISO 8601 format
  const accessExpiredAt = refreshedAuth.token.expired_at;
  const refreshableUntil = refreshedAuth.token.refreshable_until;
  typia.assert(accessExpiredAt);
  typia.assert(refreshableUntil);
  // 8. Verify access token expiration is in the future (within 1 hour)
  const now = new Date();
  const accessExpirationDate = new Date(accessExpiredAt);
  TestValidator.predicate(
    "access token expires in the future",
    accessExpirationDate > now,
  );
  // 9. Verify access token expiration is approximately 1 hour from now
  const oneHourMs = 60 * 60 * 1000;
  const timeDiff = accessExpirationDate.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires within 1 hour",
    timeDiff >= 0 && timeDiff <= oneHourMs * 1.1,
  );
  // 10. Verify refreshable_until is after access token expiration
  TestValidator.predicate(
    "refreshable until after access expires",
    new Date(refreshableUntil) > accessExpirationDate,
  );
  // 11. Verify session status is active
  TestValidator.equals(
    "session status is active",
    refreshedAuth.status,
    "active",
  );
  // 12. Verify guest has sessions_count
  TestValidator.predicate(
    "guest has sessions count",
    refreshedAuth.sessions_count >= 1,
  );
}
