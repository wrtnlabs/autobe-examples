import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial guest session
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(joinResponse);
  // Step 2: Capture refresh token and store old tokens
  const oldRefreshToken = joinResponse.token.refresh;
  const oldAccessToken = joinResponse.token.access;
  const oldExpiredAt = joinResponse.token.expired_at;
  // Store session details for validation
  const originalId = joinResponse.id;
  const originalSessionId = joinResponse.session_id;
  const originalDeviceIdentifier = joinResponse.device_identifier;
  // Step 3: Refresh the guest session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IHrmPlatformGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 4: Validate session continuity - same guest identity
  TestValidator.equals(
    "refresh response id matches join id",
    refreshResponse.id,
    originalId,
  );
  TestValidator.equals(
    "refresh response device_identifier unchanged",
    refreshResponse.device_identifier,
    originalDeviceIdentifier,
  );
  TestValidator.equals(
    "refresh response organization_id is null for guest",
    refreshResponse.organization_id,
    null,
  );
  TestValidator.equals(
    "refresh response session_id matches original session_id",
    refreshResponse.session_id,
    originalSessionId,
  );
  // Step 5: Validate new tokens are generated (token rotation for security)
  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;
  TestValidator.notEquals(
    "new access token differs from old access token",
    newAccessToken,
    oldAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from old refresh token",
    newRefreshToken,
    oldRefreshToken,
  );
  // Verify new expiration times are in the future
  const now = new Date();
  TestValidator.predicate(
    "new expired_at is in future",
    new Date(newExpiredAt) > now,
  );
  TestValidator.predicate(
    "new refreshable_until is in future",
    new Date(newRefreshableUntil) > now,
  );
  // Step 6: Verify old tokens are invalidated
  // Test that old refresh token cannot be used for refresh
  await TestValidator.error(
    "old refresh token is invalidated after refresh",
    async () => {
      await authorize_guest_refresh(refreshConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies IHrmPlatformGuest.IRefresh,
      });
    },
  );
  // Create connection with old access token and verify it's rejected
  const oldTokenConnection: api.IConnection = { host: connection.host };
  if (oldTokenConnection.headers === undefined) {
    oldTokenConnection.headers = {};
  }
  oldTokenConnection.headers.Authorization = `Bearer ${oldAccessToken}`;
  // Test that old access token is rejected by attempting a refresh with it
  await TestValidator.httpError(
    "old access token is rejected as 401",
    401,
    async () => {
      await api.functional.hrmPlatform.auth.guest.refresh(oldTokenConnection, {
        body: {
          refresh_token: newRefreshToken,
        } satisfies IHrmPlatformGuest.IRefresh,
      });
    },
  );
}