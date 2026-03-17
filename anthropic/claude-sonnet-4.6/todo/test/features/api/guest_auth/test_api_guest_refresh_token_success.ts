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

export async function test_api_guest_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a guest account and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    },
  });
  typia.assert(joinResponse);
  // Step 2: Use the refresh token from join to call the refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refreshToken: joinResponse.token.refresh,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 3: Validate the identity is preserved
  TestValidator.equals(
    "guest id preserved after refresh",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "device fingerprint preserved after refresh",
    refreshResponse.device_fingerprint,
    joinResponse.device_fingerprint,
  );
  TestValidator.equals(
    "created_at preserved after refresh",
    refreshResponse.created_at,
    joinResponse.created_at,
  );
  // Step 4: Validate new tokens are non-empty strings
  TestValidator.predicate(
    "new access token is non-empty",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is non-empty",
    refreshResponse.token.refresh.length > 0,
  );
  // Step 5: Validate token expiry timestamps are in the future
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token expired_at is in the future",
    refreshResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshResponse.token.refreshable_until > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshResponse.token.refreshable_until > refreshResponse.token.expired_at,
  );
  // Step 6: Verify new tokens differ from the original (new session issued)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
}
