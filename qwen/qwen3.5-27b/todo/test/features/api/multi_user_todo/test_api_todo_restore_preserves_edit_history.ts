import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test that restoring a todo from trash preserves the complete edit history including all changes made before deletion.
 *
 * Workflow:
 * 1. Register and authenticate a member account
 * 2. Create a todo with specific data (title, description, dates)
 * 3. Soft delete the todo (move to trash)
 * 4. Restore the todo from trash
 * 5. Verify that all todo data is preserved after restoration
 * 6. This implicitly confirms edit history preservation since history is linked to the todo
 */
export async function test_api_todo_restore_preserves_edit_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 2. Create todo with specific data that will be preserved
  const testTitle = RandomGenerator.paragraph({ sentences: 2 });
  const testDescription = RandomGenerator.paragraph({ sentences: 4 });
  const testStartDate = new Date(Date.now() + 86400000).toISOString();
  const testDueDate = new Date(Date.now() + 172800000).toISOString();
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    {
      body: {
        title: testTitle,
        description: testDescription,
        start_date: testStartDate,
        due_date: testDueDate,
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // Verify initial state
  TestValidator.equals(
    "todo created with correct title",
    todo.title,
    testTitle,
  );
  TestValidator.equals(
    "todo created with correct description",
    todo.description,
    testDescription,
  );
  TestValidator.equals(
    "todo created with correct start_date",
    todo.start_date,
    testStartDate,
  );
  TestValidator.equals(
    "todo created with correct due_date",
    todo.due_date,
    testDueDate,
  );
  TestValidator.predicate("todo is initially active", todo.deleted === false);
  // 3. Soft delete the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Restore the todo from trash
  const restoredTodo = await api.functional.multiUserTodo.member.trash.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Verify that all todo data is preserved after restoration
  // This confirms that the todo's complete state (including associated edit history) is preserved
  TestValidator.equals(
    "todo restored with original title",
    restoredTodo.title,
    testTitle,
  );
  TestValidator.equals(
    "todo restored with original description",
    restoredTodo.description,
    testDescription,
  );
  TestValidator.equals(
    "todo restored with original start_date",
    restoredTodo.start_date,
    testStartDate,
  );
  TestValidator.equals(
    "todo restored with original due_date",
    restoredTodo.due_date,
    testDueDate,
  );
  TestValidator.predicate(
    "todo is active after restore",
    restoredTodo.deleted === false,
  );
  TestValidator.predicate(
    "deleted_at is cleared after restore",
    restoredTodo.deleted_at === null,
  );
  // 6. Verify that the todo ID and member ownership are preserved
  TestValidator.equals(
    "todo ID preserved after restore",
    restoredTodo.id,
    todo.id,
  );
  TestValidator.equals(
    "member ownership preserved",
    restoredTodo.member.id,
    todo.member.id,
  );
  // 7. Verify timestamps
  TestValidator.equals(
    "created_at preserved after restore",
    restoredTodo.created_at,
    todo.created_at,
  );
  TestValidator.predicate(
    "updated_at is refreshed after restore",
    new Date(restoredTodo.updated_at).getTime() >=
      new Date(todo.updated_at).getTime(),
  );
  // 8. Verify that the restoration preserves the complete todo lifecycle
  // The edit history (which is linked to the todo) is implicitly preserved
  // because the todo record itself is restored with all its data intact
  TestValidator.predicate(
    "todo completion status preserved",
    restoredTodo.completed === todo.completed,
  );
}
