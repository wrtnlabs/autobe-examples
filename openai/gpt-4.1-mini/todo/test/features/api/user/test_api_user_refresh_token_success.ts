import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. New user registration
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // 2. Setup user connection with join token
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorized.token.access;
  // 3. Use refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_user_refresh(refreshConnection, {
    body: {},
  });
  typia.assert(refreshed);
  // 4. Validate token properties
  TestValidator.predicate(
    "access token format",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token format",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  // 5. Validate that expired_at is valid ISO datetime string
  typia.assert(refreshed.token.expired_at);
  typia.assert(refreshed.token.refreshable_until);
  // 6. Check that expired_at is in the future
  const expiredAt = new Date(refreshed.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration future",
    expiredAt.getTime() > now.getTime(),
  );
  // 7. Check that refreshable_until is in the future
  const refreshableUntil = new Date(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "refresh token expiration future",
    refreshableUntil.getTime() > now.getTime(),
  );
}
