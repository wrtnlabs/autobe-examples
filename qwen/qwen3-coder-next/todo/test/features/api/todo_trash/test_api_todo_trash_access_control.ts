import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_trash_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user and authenticate
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Creds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies ITodoAppUser.IJoin;
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: user1Creds,
  });
  typia.assert(user1Authorized);
  // 2. Create a todo item as first user
  const todo = await api.functional.todoApp.user.todos.create(user1Connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Soft-delete the todo item (move to trash) as first user
  await api.functional.todoApp.user.todos.erase(user1Connection, {
    todoId: (todo as IEntity & { id: string }).id,
  });
  // 4. Create second user and authenticate
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Creds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies ITodoAppUser.IJoin;
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: user2Creds,
  });
  typia.assert(user2Authorized);
  // 5. Attempt to permanently delete the first user's trash entry as second user
  // This should fail with an appropriate error
  await TestValidator.error("trash access denied - wrong owner", async () => {
    await api.functional.todoApp.user.trash.erase(user2Connection, {
      trashId: (todo as IEntity & { id: string }).id,
    });
  });
}