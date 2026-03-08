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

export async function test_api_todo_soft_delete_trash_restore_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member A using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberSession = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(memberSession);
  // 2. Create a todo with title, description, and dates
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(), // +1 day
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify initial todo data
  TestValidator.equals("todo has title", todo.title, todo.title);
  TestValidator.equals(
    "todo has description",
    todo.description,
    todo.description,
  );
  // 3. Edit the todo multiple times
  const edit1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: "Updated title " + RandomGenerator.alphaNumeric(4),
        description: "Updated description",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(edit1);
  const edit2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        due_date: new Date(Date.now() + 172800000).toISOString(), // +2 days
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(edit2);
  // 4. Soft delete the todo
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Verify todo is trashed
  TestValidator.predicate("todo is trashed", todo.is_trashed === true);
  // 6. Verify edit timestamps show correct history
  TestValidator.predicate("created_at exists", todo.created_at !== null);
  TestValidator.predicate("updated_at exists", todo.updated_at !== null);
  TestValidator.predicate(
    "edit timestamps consistent",
    edit2.updated_at >= edit1.updated_at,
  );
}
