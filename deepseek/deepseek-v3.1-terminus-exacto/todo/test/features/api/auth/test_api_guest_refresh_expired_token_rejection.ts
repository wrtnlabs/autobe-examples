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

export async function test_api_guest_refresh_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create guest account and obtain refresh token for testing
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  const validRefreshToken = authorized.token.refresh;
  // Test 1: Valid refresh token should work initially
  const guestConnection2: api.IConnection = { host: connection.host };
  const refreshed = await authorize_guest_refresh(guestConnection2, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshed);
  // Test 2: Try to use the same refresh token again (token reuse)
  // According to typical JWT refresh token patterns, using the same refresh token
  // after it has already been used should be rejected
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh token reuse rejected",
    401, // Unauthorized or similar error code
    async () => {
      await api.functional.multiUserTodo.auth.guest.refresh(reuseConnection, {
        body: {
          refresh_token: validRefreshToken,
        } satisfies IMultiUserTodoGuest.IRefresh,
      });
    },
  );
  // Test 3: Use the new refresh token from first refresh (should work)
  const newConnection: api.IConnection = { host: connection.host };
  const secondRefresh = await authorize_guest_refresh(newConnection, {
    body: {
      refresh_token: refreshed.token.refresh,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(secondRefresh);
  // Test 4: Try to reuse the first new refresh token (should be rejected)
  const reuseNewConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "second refresh token reuse rejected",
    401,
    async () => {
      await api.functional.multiUserTodo.auth.guest.refresh(
        reuseNewConnection,
        {
          body: {
            refresh_token: refreshed.token.refresh,
          } satisfies IMultiUserTodoGuest.IRefresh,
        },
      );
    },
  );
  // Validate token rotation: each refresh produces new tokens
  TestValidator.notEquals(
    "refresh tokens rotate on each use",
    validRefreshToken,
    refreshed.token.refresh,
  );
  TestValidator.notEquals(
    "refresh tokens continue to rotate",
    refreshed.token.refresh,
    secondRefresh.token.refresh,
  );
  // Validate that access tokens also rotate
  TestValidator.notEquals(
    "access tokens rotate on refresh",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "access tokens continue to rotate",
    refreshed.token.access,
    secondRefresh.token.access,
  );
}
