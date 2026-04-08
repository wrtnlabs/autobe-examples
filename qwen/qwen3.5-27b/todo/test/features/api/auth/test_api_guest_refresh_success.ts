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
 * Test the successful guest token refresh workflow.
 *
 * Validates the complete guest token refresh flow by first registering a guest to obtain initial authentication tokens, then using the refresh token to obtain new tokens. Ensures that the refresh operation extends the session while maintaining the same guest identity.
 *
 * The test verifies that both access and refresh tokens are rotated (replaced with new values) and that the expiration timestamps are extended. The guest ID must remain consistent across the join and refresh operations, confirming that the same guest session is being extended rather than creating a new one.
 *
 * 1. Register a guest using authorize_guest_join to obtain initial tokens.
 * 2. Extract the refresh token from the join response.
 * 3. Create a new connection for the refresh operation.
 * 4. Call authorize_guest_refresh with the valid refresh token.
 * 5. Verify new tokens are different from original tokens.
 * 6. Verify expiration timestamps are extended.
 * 7. Verify guest ID remains the same.
 */
export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest and obtain initial tokens
  const guestConnection1: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection1, {
    body: undefined,
  });
  typia.assert(joinResponse);
  // Store original values for comparison
  const originalGuestId = joinResponse.id;
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  const originalExpiredAt = joinResponse.token.expired_at;
  const originalRefreshableUntil = joinResponse.token.refreshable_until;
  // 2. Create new connection for refresh operation
  const guestConnection2: api.IConnection = { host: connection.host };
  // 3. Refresh tokens using the refresh token from join response
  const refreshResponse = await authorize_guest_refresh(guestConnection2, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify guest ID remains the same
  TestValidator.equals(
    "guest ID remains unchanged",
    refreshResponse.id,
    originalGuestId,
  );
  // 5. Verify access token is rotated (different from original)
  TestValidator.notEquals(
    "access token is rotated",
    refreshResponse.token.access,
    originalAccessToken,
  );
  // 6. Verify refresh token is rotated (different from original)
  TestValidator.notEquals(
    "refresh token is rotated",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // 7. Verify expired_at is extended (new expiration is after original)
  TestValidator.predicate(
    "access token expiration is extended",
    new Date(refreshResponse.token.expired_at) > new Date(originalExpiredAt),
  );
  // 8. Verify refreshable_until is extended (new deadline is after original)
  TestValidator.predicate(
    "refresh deadline is extended",
    new Date(refreshResponse.token.refreshable_until) >
      new Date(originalRefreshableUntil),
  );
}
