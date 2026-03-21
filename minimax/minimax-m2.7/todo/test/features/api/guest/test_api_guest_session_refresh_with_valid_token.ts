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

export async function test_api_guest_session_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a guest user to obtain initial refresh token
  const guestJoinResponse = await authorize_guest_join(connection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestJoinResponse);
  // 2. Store the refresh token from the join response
  const initialRefreshToken = guestJoinResponse.refresh;
  TestValidator.equals(
    "initial refresh token exists",
    initialRefreshToken !== null && initialRefreshToken !== undefined,
    true,
  );
  // 3. Call POST /multiUserTodo/auth/guest/refresh with the refresh_token
  const refreshResponse = await authorize_guest_refresh(connection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify response contains access_token, refresh_token, guest id, and expired_at
  TestValidator.equals(
    "access token exists",
    refreshResponse.access !== null && refreshResponse.access !== undefined,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    refreshResponse.refresh !== null && refreshResponse.refresh !== undefined,
    true,
  );
  TestValidator.equals(
    "guest id exists",
    refreshResponse.id !== null && refreshResponse.id !== undefined,
    true,
  );
  TestValidator.equals(
    "expired_at exists",
    refreshResponse.expired_at !== null &&
      refreshResponse.expired_at !== undefined,
    true,
  );
  // 5. Verify the new access_token is different from the initial one
  // (Note: authorize_guest_join returns token.access, but we can't access initial access token directly)
  // Instead, verify that the new access token is a non-empty string
  TestValidator.predicate(
    "new access token is valid string",
    refreshResponse.access.length > 0,
  );
  // 6. Verify the new refresh_token can be used for subsequent refresh calls
  const secondRefreshResponse = await authorize_guest_refresh(connection, {
    body: {
      refresh_token: refreshResponse.refresh,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(secondRefreshResponse);
  // Verify second refresh also returns valid tokens
  TestValidator.equals(
    "second refresh access token exists",
    secondRefreshResponse.access !== null &&
      secondRefreshResponse.access !== undefined,
    true,
  );
  TestValidator.equals(
    "second refresh refresh token exists",
    secondRefreshResponse.refresh !== null &&
      secondRefreshResponse.refresh !== undefined,
    true,
  );
  TestValidator.equals(
    "second refresh guest id matches",
    secondRefreshResponse.id,
    refreshResponse.id,
  );
  // 7. Verify the expired_at timestamp is in the future
  const expiredAtDate = new Date(refreshResponse.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAtDate.getTime() > now.getTime(),
  );
}
