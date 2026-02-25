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

export async function test_api_todo_permanent_deletion_rejection_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://todoapp.test/auth/join",
      referrer: "https://todoapp.test",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create an active todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify todo is active (deleted_at is null)
  TestValidator.equals("todo should be active", todo.deleted_at, null);
  // Attempt permanent deletion on active todo - should fail
  await TestValidator.error(
    "permanent deletion should fail on active todo",
    async () => {
      await api.functional.todoApp.user.todos.permanent.erase(userConnection, {
        todoId: todo.id,
      });
    },
  );
  // The successful error validation above confirms that:
  // 1. The permanent deletion operation was rejected
  // 2. The business rule enforcement is working correctly
  // 3. The todo remains protected from accidental permanent deletion
  //
  // Since we don't have a GET todo endpoint in the provided SDK,
  // the error validation sufficiently confirms the todo protection logic
}
