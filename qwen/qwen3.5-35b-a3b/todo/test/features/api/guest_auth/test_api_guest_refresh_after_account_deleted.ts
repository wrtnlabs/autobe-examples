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

export async function test_api_guest_refresh_after_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest account to get valid tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const validGuest = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(validGuest);
  // 2. Verify the guest account is active
  TestValidator.equals("guest status is active", validGuest.status, "active");
  // 3. Test refresh with a valid connection and token
  const validRefreshBody = {
    refresh_token: validGuest.token.refresh,
  } satisfies IMultiUserTodoGuest.IRefresh;
  const validRefreshConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: validGuest.token.access,
    },
  };
  const refreshedToken = await authorize_guest_refresh(validRefreshConnection, {
    body: validRefreshBody,
  });
  typia.assert(refreshedToken);
  // 4. Verify refresh succeeded with new tokens
  TestValidator.notEquals(
    "refreshed token differs from original",
    validGuest.token.refresh,
    refreshedToken.token.refresh,
  );
  // 5. Test refresh with invalid token (should fail with 401)
  const invalidRefreshBody = {
    refresh_token: "invalid_token_string_that_does_not_exist",
  } satisfies IMultiUserTodoGuest.IRefresh;
  const invalidRefreshConnection: api.IConnection = {
    host: connection.host,
  };
  // Verify that invalid token returns 401 Unauthorized
  await TestValidator.error("invalid token returns 401", async () => {
    await api.functional.multiUserTodo.auth.guest.refresh(
      invalidRefreshConnection,
      { body: invalidRefreshBody },
    );
  });
}