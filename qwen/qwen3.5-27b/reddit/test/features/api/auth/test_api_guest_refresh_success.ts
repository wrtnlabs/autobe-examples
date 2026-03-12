import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest token refresh workflow.
 * 1. Register a new guest account to obtain initial tokens
 * 2. Use the refresh token to call the refresh endpoint
 * 3. Validate new tokens are returned with updated expiration times
 * 4. Confirm token rotation (new refresh token differs from original)
 * 5. Verify session extension (expired_at is extended)
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register guest account to obtain initial tokens
  const guestConnection1: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection1, {
    body: undefined,
  });
  typia.assert(initialAuth);
  // Capture initial token values for comparison
  const originalRefreshToken = initialAuth.token.refresh;
  const originalExpiredAt = initialAuth.token.expired_at;
  // Step 2: Create new connection for refresh operation
  const guestConnection2: api.IConnection = { host: connection.host };
  // Step 3: Refresh the guest token
  const refreshedAuth = await authorize_guest_refresh(guestConnection2, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditCloneGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 4: Validate token rotation occurred
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // Step 5: Validate new access token is different
  TestValidator.notEquals(
    "access token rotated",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // Step 6: Validate session extension (new expired_at > original)
  TestValidator.predicate(
    "expired_at extended",
    new Date(refreshedAuth.token.expired_at) > new Date(originalExpiredAt),
  );
  // Step 7: Validate refreshable_until is also updated
  TestValidator.notEquals(
    "refreshable_until updated",
    initialAuth.token.refreshable_until,
    refreshedAuth.token.refreshable_until,
  );
}
