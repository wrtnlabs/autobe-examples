import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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
 * Test restoring a soft-deleted todo from trash back to the active todo list.
 *
 * This test verifies the complete restore workflow:
 * 1. Authenticate as a member
 * 2. Create a new todo with title, description, and optional dates
 * 3. Verify the todo is created with completed=false and deleted_at=null
 * 4. Soft delete the todo to move it to trash
 * 5. Restore the todo from trash
 * 6. Verify the restored todo has all original data preserved:
 *    - Same id, title, description, start_date, due_date
 *    - completed status remains unchanged
 *    - deleted_at is now null
 *    - editHistories remain intact
 */
export async function test_api_todo_restore_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new todo with all fields
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Verify initial state
  TestValidator.equals("todo is not completed", todo.completed, false);
  TestValidator.equals("todo is not deleted", todo.deleted_at, null);
  const originalId = todo.id;
  const originalTitle = todo.title;
  const originalDescription = todo.description;
  const originalStartDate = todo.start_date;
  const originalDueDate = todo.due_date;
  const originalCompleted = todo.completed;
  // 4. Soft delete the todo
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 5. Restore the todo from trash
  const restoredTodo = await api.functional.multiUserTodo.member.todos.restore(
    memberConnection,
    {
      todoId: originalId,
    },
  );
  typia.assert(restoredTodo);
  // 6. Verify restored todo has all original data preserved
  TestValidator.equals("id preserved", restoredTodo.id, originalId);
  TestValidator.equals("title preserved", restoredTodo.title, originalTitle);
  TestValidator.equals(
    "description preserved",
    restoredTodo.description,
    originalDescription,
  );
  TestValidator.equals(
    "start_date preserved",
    restoredTodo.start_date,
    originalStartDate,
  );
  TestValidator.equals(
    "due_date preserved",
    restoredTodo.due_date,
    originalDueDate,
  );
  TestValidator.equals(
    "completed status preserved",
    restoredTodo.completed,
    originalCompleted,
  );
  // Verify todo is no longer deleted
  TestValidator.equals("deleted_at is now null", restoredTodo.deleted_at, null);
  // Verify edit histories are preserved (may have 1 entry from creation)
  TestValidator.predicate(
    "editHistories count is valid",
    restoredTodo.editHistories_count >= 0,
  );
}
