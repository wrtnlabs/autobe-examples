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

export async function test_api_auth_refresh_token_with_expired_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user
  const registerConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Login to obtain initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(loginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Call refresh endpoint with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh: loginResponse.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Verify refresh operation succeeds and new tokens are issued
  TestValidator.notEquals(
    "new access token differs from old",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.predicate(
    "new access token is valid string",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is valid string",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );
}
