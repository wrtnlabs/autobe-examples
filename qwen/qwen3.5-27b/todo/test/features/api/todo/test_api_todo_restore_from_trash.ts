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
 * Test the complete restore workflow for todos moved to trash.
 *
 * Validates that a soft-deleted todo can be successfully restored from trash back to active state, preserving all original properties including title, description, start date, due date, and completion status. The test verifies that the deleted_at field is cleared after restoration and that the todo remains owned by the authenticated member.
 *
 * This test exercises the full lifecycle: member registration, todo creation with comprehensive data, soft deletion to trash, and restoration back to active state.
 *
 * 1. Register a new member account and authenticate.
 * 2. Create a todo with title, description, start date, and due date.
 * 3. Soft delete the todo to move it to trash.
 * 4. Restore the todo from trash.
 * 5. Validate that deleted_at is null and all properties are preserved.
 */
export async function test_api_todo_restore_from_trash(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a todo with comprehensive data
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todo);
  // 3. Soft delete the todo (move to trash)
  await api.functional.todoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.member.trash.restore(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(restoredTodo);
  // 5. Validate restoration
  TestValidator.equals("todo ID preserved", restoredTodo.id, todo.id);
  TestValidator.equals("title preserved", restoredTodo.title, todo.title);
  TestValidator.equals(
    "description preserved",
    restoredTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "start_date preserved",
    restoredTodo.start_date,
    todo.start_date,
  );
  TestValidator.equals(
    "due_date preserved",
    restoredTodo.due_date,
    todo.due_date,
  );
  TestValidator.equals(
    "completed status preserved",
    restoredTodo.completed,
    todo.completed,
  );
  TestValidator.equals(
    "deleted_at is null after restore",
    restoredTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "member ID preserved",
    restoredTodo.member.id,
    todo.member.id,
  );
}
