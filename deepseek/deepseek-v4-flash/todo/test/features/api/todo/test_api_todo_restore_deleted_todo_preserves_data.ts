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

/**
 * Test restoring a soft-deleted todo preserves all original data.
 *
 * Validates the complete lifecycle of a todo item that is created, completed, soft-deleted, and then restored from the trash. Ensures that after restoration, all original attributes — including the todo's completion status — are preserved unchanged and the todo is no longer in the trashed state.
 *
 * 1. Register a new member account via the join endpoint.
 * 2. Create a todo with all fields (title, description, start_date, due_date).
 * 3. Mark the todo as complete.
 * 4. Soft-delete the todo (moves to trash).
 * 5. Restore the deleted todo from trash.
 * 6. Verify the restored todo has `deleted_at = null` (active state).
 * 7. Verify all original attributes (title, description, start_date, due_date, completed_at) are preserved unchanged.
 */
export async function test_api_todo_restore_deleted_todo_preserves_data(
  connection: api.IConnection,
): Promise<void> {
  //----
  // 1. Register a new member
  //----
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joined);
  //----
  // 2. Create a todo with all fields
  //----
  const title: string = RandomGenerator.paragraph({ sentences: 2 });
  const description: string = RandomGenerator.content({ paragraphs: 1 });
  const startDate: string = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dueDate: string = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: title,
        description: description,
        start_date: startDate,
        due_date: dueDate,
      } satisfies DeepPartial<ITodoAppTodo.ICreate>,
    },
  );
  typia.assert(todo);
  TestValidator.equals("title matches input", todo.title, title);
  TestValidator.equals(
    "description matches input",
    todo.description,
    description,
  );
  TestValidator.equals("start_date matches input", todo.start_date, startDate);
  TestValidator.equals("due_date matches input", todo.due_date, dueDate);
  TestValidator.predicate(
    "completed_at is null initially",
    todo.completed_at === null,
  );
  TestValidator.predicate(
    "deleted_at is null initially",
    todo.deleted_at === null,
  );
  //----
  // 3. Mark the todo as complete
  //----
  const completed = await api.functional.todoApp.member.todos.complete(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(completed);
  TestValidator.predicate(
    "completed_at is set after completion",
    completed.completed_at !== null,
  );
  //----
  // 4. Soft-delete the todo
  //----
  await api.functional.todoApp.member.todos.eraseByTodoid(memberConnection, {
    todoId: todo.id,
  });
  //----
  // 5. Restore the deleted todo
  //----
  const restored = await api.functional.todoApp.member.todos.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restored);
  //----
  // 6. Verify the restored todo properties
  //----
  TestValidator.predicate(
    "deleted_at is null after restore",
    restored.deleted_at === null,
  );
  TestValidator.equals("title preserved", restored.title, title);
  TestValidator.equals(
    "description preserved",
    restored.description,
    description,
  );
  TestValidator.equals("start_date preserved", restored.start_date, startDate);
  TestValidator.equals("due_date preserved", restored.due_date, dueDate);
  TestValidator.equals(
    "completed_at preserved",
    restored.completed_at,
    completed.completed_at,
  );
}
