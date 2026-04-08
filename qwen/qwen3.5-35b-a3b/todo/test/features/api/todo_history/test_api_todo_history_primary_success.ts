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
 * Test primary success path for retrieving edit history of a todo.
 *
 * Validates the complete edit history workflow where an authenticated member creates
 * a todo, performs two separate edits on different fields, and retrieves the edit
 * history to verify both changes are recorded correctly. Ensures that the history
 * contains the expected number of entries with proper sorting and field-level
 * change tracking.
 *
 * Special attention is given to verifying that each edit history entry correctly
 * captures which fields were modified in that particular edit operation, with null
 * values for fields that weren't changed in that specific edit.
 *
 * 1. Member joins account with randomized credentials.
 * 2. Member creates a todo with title, description, start_date, and due_date.
 * 3. First edit: change title and description only.
 * 4. Second edit: change start_date and due_date only.
 * 5. Retrieve edit history and validate structure and content.
 */
export async function test_api_todo_history_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create todo with all fields
  const todo: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todo);
  // 3. First edit: change title and description only
  const firstTitle = RandomGenerator.paragraph({ sentences: 2 });
  const firstDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedTodo1: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: {
        title: firstTitle,
        description: firstDescription,
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(updatedTodo1);
  // 4. Second edit: change start_date and due_date only
  const secondStartDate = new Date(Date.now() + 86400000).toISOString();
  const secondDueDate = new Date(Date.now() + 172800000).toISOString();
  const updatedTodo2: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.update(memberConnection, {
      todoId: todo.id,
      body: {
        start_date: secondStartDate,
        due_date: secondDueDate,
      } satisfies IMultiUserTodoTodo.IUpdate,
    });
  typia.assert(updatedTodo2);
  // 5. Retrieve edit history
  const history: IMultiUserTodoTodo.IEditEntry[] = typia.assert<IMultiUserTodoTodo.IEditEntry[]>(
    await api.functional.multiUserTodo.member.todos.history(memberConnection, {
      todoId: todo.id,
    }),
  );
  typia.assert(history);
  // 6. Validate history structure
  TestValidator.equals("edit history count", history.length, 2);
  // Most recent edit should appear first
  TestValidator.equals(
    "most recent edited_at",
    history[0].edited_at,
    updatedTodo2.updated_at,
  );
  TestValidator.equals(
    "oldest edited_at",
    history[1].edited_at,
    updatedTodo1.updated_at,
  );
  // First edit (oldest, index 1) should have title/description changes, dates null
  TestValidator.equals(
    "first edit old_title is original",
    history[1].old_title,
    todo.title,
  );
  TestValidator.equals(
    "first edit new_title is changed",
    history[1].new_title,
    firstTitle,
  );
  TestValidator.equals(
    "first edit old_description is original",
    history[1].old_description,
    todo.description,
  );
  TestValidator.equals(
    "first edit new_description is changed",
    history[1].new_description,
    firstDescription,
  );
  TestValidator.equals(
    "first edit old_start_date is null",
    history[1].old_start_date,
    null,
  );
  TestValidator.equals(
    "first edit new_start_date is null",
    history[1].new_start_date,
    null,
  );
  TestValidator.equals(
    "first edit old_due_date is null",
    history[1].old_due_date,
    null,
  );
  TestValidator.equals(
    "first edit new_due_date is null",
    history[1].new_due_date,
    null,
  );
  // Second edit (most recent, index 0) should have date changes, title/description null
  TestValidator.equals(
    "second edit old_start_date is original",
    history[0].old_start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "second edit new_start_date is changed",
    history[0].new_start_date,
    secondStartDate,
  );
  TestValidator.equals(
    "second edit old_due_date is original",
    history[0].old_due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "second edit new_due_date is changed",
    history[0].new_due_date,
    secondDueDate,
  );
  TestValidator.equals(
    "second edit old_title is null",
    history[0].old_title,
    null,
  );
  TestValidator.equals(
    "second edit new_title is null",
    history[0].new_title,
    null,
  );
  TestValidator.equals(
    "second edit old_description is null",
    history[0].old_description,
    null,
  );
  TestValidator.equals(
    "second edit new_description is null",
    history[0].new_description,
    null,
  );
}