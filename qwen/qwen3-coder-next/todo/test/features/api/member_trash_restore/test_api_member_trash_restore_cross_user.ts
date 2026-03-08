import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_member_trash_restore_cross_user(
  connection: api.IConnection,
): Promise<void> {
  // Create userA account
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await api.functional.todoApp.auth.member.join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(userA);
  // Create userB account
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await api.functional.todoApp.auth.member.join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(userB);
  // UserA creates a todo item
  const todo = await api.functional.todoApp.member.todos.create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo belongs to userA",
    todo.todo_app_user_id,
    userA.user.id,
  );
  // UserA soft-deletes the todo
  await api.functional.todoApp.member.todos.erase(userAConnection, {
    todoId: todo.id,
  });
  // UserB attempts to restore userA's todo (should fail with 404/403)
  await TestValidator.error(
    "userB cannot restore userA's trashed todo",
    async () => {
      await api.functional.todoApp.member.trash.restore(userBConnection, {
        todoId: todo.id,
      });
    },
  );
  // Verify userA can still restore their own todo
  const restoredTodo = await api.functional.todoApp.member.trash.restore(
    userAConnection,
    { todoId: todo.id },
  );
  typia.assert(restoredTodo);
  TestValidator.equals(
    "userA can restore their own todo",
    restoredTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "todo restored to active",
    restoredTodo.is_trashed,
    false,
  );
  // Re-delete for final verification
  await api.functional.todoApp.member.todos.erase(userAConnection, {
    todoId: todo.id,
  });
  // Verify userB still cannot restore
  await TestValidator.error(
    "userB still cannot restore userA's trashed todo after re-delete",
    async () => {
      await api.functional.todoApp.member.trash.restore(userBConnection, {
        todoId: todo.id,
      });
    },
  );
}
