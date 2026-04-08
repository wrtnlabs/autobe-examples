import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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
 * Test that updating a todo automatically creates an edit history entry.
 *
 * Validates the automatic edit history creation business rule by creating a todo, updating its title and due date, then verifying that an edit history entry was created recording the changed fields. This ensures the audit trail functionality properly tracks all modifications to todos.
 *
 * The test creates a member account, creates an initial todo with a title and due date, then updates both fields. After the update, the todo's editHistories array should contain exactly one entry with the new title and dueAt values populated, while description and startedAt remain null since they were not changed.
 *
 * 1. Member registers with email and password using authorize_member_join.
 * 2. Member creates a todo with initial title and due date.
 * 3. Member updates the todo's title and due date to new values.
 * 4. Validates that the updated todo has exactly one edit history entry.
 * 5. Validates that the edit history entry contains the new title and due_at values.
 * 6. Validates that unchanged fields (description, startedAt) are null in the history entry.
 */
export async function test_api_todo_edit_history_auto_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Create initial todo with title and due date
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const initialDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: initialTitle,
        due_date: initialDueDate,
      },
    },
  );
  typia.assert(todo);
  // Verify initial state - no edit history on creation
  TestValidator.equals(
    "initial edit history empty",
    todo.editHistories.length,
    0,
  );
  // 3. Update todo with new title and due date
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 14,
  ).toISOString();
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: updatedTitle,
        due_date: updatedDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validate edit history was created
  TestValidator.equals(
    "one edit history entry created",
    updatedTodo.editHistories.length,
    1,
  );
  const editHistory = updatedTodo.editHistories[0]!;
  typia.assert(editHistory);
  // 5. Validate the edit history contains the changed fields
  TestValidator.equals("title changed", editHistory.title, updatedTitle);
  TestValidator.equals("due date changed", editHistory.dueAt, updatedDueDate);
  // 6. Validate unchanged fields are null in history
  TestValidator.equals("description unchanged", editHistory.description, null);
  TestValidator.equals("start date unchanged", editHistory.startedAt, null);
  // 7. Validate edit history has valid timestamp
  TestValidator.predicate("edit history has valid timestamp", () => {
    const editTime = new Date(editHistory.createdAt).getTime();
    const now = Date.now();
    return editTime <= now && editTime > now - 1000 * 60 * 5;
  });
  // 8. Validate the todo's updated_at timestamp changed
  TestValidator.predicate("todo updated_at changed", () => {
    const updateTime = new Date(updatedTodo.updatedAt).getTime();
    const createTime = new Date(todo.createdAt).getTime();
    return updateTime >= createTime;
  });
}
