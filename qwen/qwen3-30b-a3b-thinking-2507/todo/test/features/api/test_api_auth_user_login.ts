import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITodoTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodoUser";

export async function test_api_auth_user_login(connection: api.IConnection) {
  const output: ITodoTodoUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: typia.random<ITodoTodoUser.ILogin>(),
    });
  typia.assert(output);
}
