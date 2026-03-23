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

/**
 * Test successful guest authentication token refresh.
 *
 * This test verifies that an authenticated guest can successfully refresh
 * their authentication tokens. The test flow:
 * 1. Register a new guest account to obtain initial tokens
 * 2. Extract the refresh token from the initial response
 * 3. Call the refresh endpoint with the valid refresh token
 * 4. Verify the response contains new access and refresh tokens
 * 5. Confirm the new tokens are different from the original tokens
 */
export async function test_api_guest_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register guest and obtain initial tokens
  const initialAuth: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {});
  typia.assert(initialAuth);
  // 3. Extract the refresh token from initial response
  const initialRefreshToken: string = initialAuth.token.refresh;
  const initialAccessToken: string = initialAuth.token.access;
  // 4. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 5. Refresh the authentication tokens
  const refreshedAuth: IMultiUserTodoGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IMultiUserTodoGuest.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 6. Verify the new tokens are different from original (refresh occurred)
  TestValidator.notEquals(
    "access token refreshed",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 7. Verify guest ID remains the same
  TestValidator.equals("guest ID unchanged", initialAuth.id, refreshedAuth.id);
  // 8. Verify token structure is valid
  TestValidator.predicate(
    "has valid expired_at",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    refreshedAuth.token.refreshable_until.length > 0,
  );
}
