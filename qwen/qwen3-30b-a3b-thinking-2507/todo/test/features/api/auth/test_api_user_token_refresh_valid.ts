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

export async function test_api_user_token_refresh_valid(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Register user
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppUser.IJoin,
  });
  // 2. Log in to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_user_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(initialAuth);
  // 3. Refresh token using the refresh token from login
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_user_refresh(refreshConnection, {
    body: {
      token: initialAuth.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResponse);
  // 4. Validate business logic - access token should be different
  TestValidator.notEquals(
    "new access token should be different from old one",
    initialAuth.token.access,
    refreshResponse.token.access,
  );
}
