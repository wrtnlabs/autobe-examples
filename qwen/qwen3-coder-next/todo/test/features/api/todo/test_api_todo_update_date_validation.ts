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

export async function test_api_todo_update_date_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
  } satisfies ITodoAppUser.IJoin;
  const user = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(user);
  // 2. Create a todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days later
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Attempt to update with start date after due date
  const invalidStartDate = new Date(Date.now() + 86400000 * 14).toISOString(); // 14 days from now
  const validDueDate = new Date(Date.now() + 86400000 * 5).toISOString(); // 5 days from now
  await TestValidator.error(
    "should reject update with start date after due date",
    async () => {
      await api.functional.todoApp.user.todos.update(userConnection, {
        todoId: "0",
        body: {
          start_date: invalidStartDate,
          due_date: validDueDate,
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
}