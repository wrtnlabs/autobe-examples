import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrincipal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrincipal";
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

export async function test_api_todo_trash_permanent_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create UserA (creator)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userA);
  // 2. Create UserB (unauthorized accessor)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userB);
  // 3. UserA creates a todo
  const todo = await api.functional.todoApp.user.todos.create(userAConnection, {
    body: {
      title: RandomGenerator.name(3),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  typia.assert(todo.user.id);
  typia.assert(userA.id);
  // 4. UserA soft-deletes the todo (moves to trash)
  await api.functional.todoApp.user.todos.erase(userAConnection, {
    todoId: todo.id,
  });
  // 5. UserB attempts to permanently delete UserA's trash item
  // Should fail with 404 error
  await TestValidator.error(
    "UserB cannot permanently delete UserA's trash item",
    async () => {
      await api.functional.todoApp.user.trash.erase(userBConnection, {
        todoId: todo.id,
      });
    },
  );
  // 6. Verify UserA can still access their trash via error handling
  // Since UserA owns the todo, they should be able to delete it permanently
  await api.functional.todoApp.user.trash.erase(userAConnection, {
    todoId: todo.id,
  });
}