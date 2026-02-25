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

export async function test_api_auth_login_success_after_join(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate and capture credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Create a new user via join
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(joinedUser);
  // 3. Use the same credentials to login
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedUser: ITodoAppUser.IAuthorized = await authorize_user_login(
    loginConnection,
    {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ILogin,
    },
  );
  typia.assert(loggedUser);
  // 4. Validate response
  TestValidator.equals("user IDs match", joinedUser.id, loggedUser.id);
  TestValidator.predicate(
    "access token is non-empty string",
    () => loggedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    () => loggedUser.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is ISO date-time", () => {
    const date = new Date(loggedUser.token.expired_at);
    return (
      !isNaN(date.getTime()) &&
      loggedUser.token.expired_at === date.toISOString()
    );
  });
  TestValidator.predicate("refreshable_until is ISO date-time", () => {
    const date = new Date(loggedUser.token.refreshable_until);
    return (
      !isNaN(date.getTime()) &&
      loggedUser.token.refreshable_until === date.toISOString()
    );
  });
}
