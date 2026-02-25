import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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
  // 1. Create new user
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: "12345678",
  } satisfies ITodoAppUser.IJoin;
  const joinedUser = await api.functional.todoApp.auth.user.join(
    joinConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinedUser);
  // 2. Login to obtain tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies ITodoAppUser.ILogin;
  const loggedInUser = await api.functional.todoApp.auth.user.login(
    loginConnection,
    {
      body: loginInput,
    },
  );
  typia.assert(loggedInUser);
  // 3. Extract refresh token from login response
  const refreshToken = loggedInUser.token.refresh;
  typia.assert<string>(refreshToken);
  // 4. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshInput = {
    refresh_token: refreshToken,
  } satisfies ITodoAppUser.IRefresh;
  const refreshedUser = await api.functional.todoApp.auth.user.refresh(
    refreshConnection,
    {
      body: refreshInput,
    },
  );
  typia.assert(refreshedUser);
  // 5. Verify new tokens are returned
  typia.assert<string>(refreshedUser.token.access);
  typia.assert<string>(refreshedUser.token.refresh);
  // 6. Verify user information matches original
  TestValidator.equals(
    "user ID matches original",
    refreshedUser.id,
    joinedUser.id,
  );
  TestValidator.equals(
    "email matches original",
    refreshedUser.email,
    joinedUser.email,
  );
  // 7. Verify token expiration structure
  typia.assert<string>(refreshedUser.token.expired_at);
  typia.assert<string>(refreshedUser.token.refreshable_until);
  // 8. Validate date-time format for expiration fields
  typia.assert<string & typia.tags.Format<"date-time">>(
    refreshedUser.token.expired_at,
  );
  typia.assert<string & typia.tags.Format<"date-time">>(
    refreshedUser.token.refreshable_until,
  );
}
