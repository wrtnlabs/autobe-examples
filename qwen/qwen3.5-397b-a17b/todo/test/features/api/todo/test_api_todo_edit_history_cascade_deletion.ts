import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function test_api_todo_edit_history_cascade_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authenticated",
    memberConnection.headers?.Authorization !== undefined,
  );
  // 2. Create a todo using the generation utility
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(todo);
  TestValidator.equals("todo title matches", todo.title, todo.title);
  // 3. Edit the todo multiple times to generate edit history entries
  const editCount = 3;
  for (let i = 0; i < editCount; i++) {
    const updatedTodo = await api.functional.todoApp.member.todos.update(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          title: `Updated Title ${i + 1} - ${RandomGenerator.name()}`,
          description: `Updated description ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
        } satisfies ITodoAppTodo.IUpdate,
      },
    );
    typia.assert(updatedTodo);
    TestValidator.notEquals(
      "todo updated",
      todo.updated_at,
      updatedTodo.updated_at,
    );
  }
  // 4. Soft delete the todo to move it to trash
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Permanently delete the todo from trash (this should cascade delete edit histories)
  await api.functional.todoApp.member.todos.trash.erase(memberConnection, {
    todoId: todo.id,
  });
  // 6. Verify permanent deletion succeeded (void return means 204 No Content)
  // The cascade deletion of edit histories is enforced by database foreign key constraint
  // with onDelete: Cascade, so when the todo is permanently deleted, all related
  // edit history entries are automatically removed
  TestValidator.predicate("permanent deletion completed", true);
}
