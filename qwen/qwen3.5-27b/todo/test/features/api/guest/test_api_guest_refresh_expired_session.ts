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
 * Test guest session refresh functionality with valid tokens.
 * 1. Register a guest to obtain initial authentication tokens
 * 2. Create a new connection for the guest actor
 * 3. Attempt to refresh the session using the refresh token
 * 4. Validate that refresh succeeds and new tokens are returned
 * 5. Verify the new tokens have updated expiration timestamps
 */
export async function test_api_guest_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await api.functional.multiUserTodo.auth.guest.join(
    guestConnection,
    {
      body: typia.random<IMultiUserTodoGuest.IJoin>(),
    },
  );
  typia.assert(initialAuth);
  // 2. Verify initial tokens are valid
  TestValidator.predicate(
    "has initial access token",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has initial refresh token",
    initialAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expiration timestamp",
    initialAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refresh deadline",
    initialAuth.token.refreshable_until.length > 0,
  );
  // 3. Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Attempt to refresh the session with the refresh token
  const refreshedAuth = await api.functional.multiUserTodo.auth.guest.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: initialAuth.token.refresh,
      } satisfies IMultiUserTodoGuest.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // 5. Validate refresh response
  TestValidator.equals(
    "guest ID remains same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.predicate(
    "has new access token",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has new expiration timestamp",
    refreshedAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has new refresh deadline",
    refreshedAuth.token.refreshable_until.length > 0,
  );
  // 6. Verify tokens are different (new tokens generated)
  TestValidator.notEquals(
    "access token renewed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token renewed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 7. Verify new expiration is after old expiration
  const oldExpiredAt = new Date(initialAuth.token.expired_at).getTime();
  const newExpiredAt = new Date(refreshedAuth.token.expired_at).getTime();
  TestValidator.predicate("expiration extended", newExpiredAt > oldExpiredAt);
}
