import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { authorize_todo_user_join } from "../../../authorize/authorize_todo_user_join";
import { authorize_todo_user_login } from "../../../authorize/authorize_todo_user_login";
import { authorize_todo_user_refresh } from "../../../authorize/authorize_todo_user_refresh";
export async function test_api_todo_user_login_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user for testing login
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_todo_user_join(userConnection, {});
  // Test successful login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_todo_user_login(loginConnection, {
    body: {
      email: user.email,
      password: "password123", // Using default password from authorize_todo_user_join
      href: "https://todo.wrtn.io/login",
      referrer: "https://todo.wrtn.io",
    },
  });
  // Validate the login result
  typia.assert(loginResult);
  TestValidator.equals("login returns user id", loginResult.id, user.id);
  TestValidator.equals(
    "login returns user email",
    loginResult.email,
    user.email,
  );
  TestValidator.predicate(
    "access token is present",
    () => !!loginResult.token.access,
  );
  TestValidator.predicate(
    "refresh token is present",
    () => !!loginResult.token.refresh,
  );
}
