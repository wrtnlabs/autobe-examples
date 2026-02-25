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

export async function test_api_user_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join a new user
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedUser = await api.functional.todoApp.auth.user.join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(joinedUser);
  // Step 2: Login to obtain tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedUser = await api.functional.todoApp.auth.user.login(
    loginConnection,
    {
      body: {
        email: joinedUser.email,
        password: joinedUser.token.access,
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(loggedUser);
  // Step 3: Try to refresh with expired token
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should return 401 for expired refresh token",
    async () => {
      await api.functional.todoApp.auth.user.refresh(refreshConnection, {
        body: {
          refresh_token: "expired_or_invalid_refresh_token",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
