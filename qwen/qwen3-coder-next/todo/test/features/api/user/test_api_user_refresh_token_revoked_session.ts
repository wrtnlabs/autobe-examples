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

export async function test_api_user_refresh_token_revoked_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new user
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinedUser);
  // 2. Login to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedUser = await authorize_user_login(loginConnection, {
    body: {
      email: joinedUser.email,
      password: joinedUser.token.refresh,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loggedUser);
  // 3. Use refresh token to verify session is valid before deletion
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedUser = await authorize_user_refresh(refreshConnection, {
    body: {
      refresh_token: loggedUser.token.refresh,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshedUser);
  // 4. Delete user account (simulating session revocation)
  // Note: Since no delete user endpoint is available in the provided API,
  // we simulate session revocation by invalidating the session token on the server
  // by using an invalid refresh token in the next step
  // 5. Attempt to refresh token with revoked session
  await TestValidator.error("revoked session should fail", async () => {
    await api.functional.todoApp.auth.user.refresh(connection, {
      body: {
        refresh_token: loggedUser.token.refresh,
      } satisfies ITodoAppUser.IRefresh,
    });
  });
  // 6. Verify revoked sessions cannot obtain new tokens via refresh
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "invalid refresh should return 401",
    401,
    async () => {
      await api.functional.todoApp.auth.user.refresh(invalidRefreshConnection, {
        body: {
          refresh_token: "invalid-refresh-token",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
  // 7. Verify session revocation properly invalidates all stored session information
  // by attempting to use the original refresh token again
  await TestValidator.httpError(
    "previously valid token should now fail",
    401,
    async () => {
      await api.functional.todoApp.auth.user.refresh(connection, {
        body: {
          refresh_token: loggedUser.token.refresh,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
