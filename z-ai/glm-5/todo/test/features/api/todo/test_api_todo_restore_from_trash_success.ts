import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test the complete restore workflow: A user creates a todo, soft-deletes it
 * (moves to trash), then restores it back to the active todo list.
 *
 * Steps:
 * 1) User authenticates via join endpoint.
 * 2) User creates a new todo with title, description, start_date, and due_date.
 * 3) User deletes the todo (soft delete - is_deleted becomes true).
 * 4) User calls restore endpoint with the todo ID.
 * 5) Verify response returns the complete todo entity with is_deleted=false.
 *
 * Note: This test focuses on the restore endpoint functionality. The delete
 * endpoint is not available in the provided API functions, so full workflow
 * verification is limited to the restore operation.
 */
export async function test_api_todo_restore_from_trash_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_user_join(userConnection, {});
  typia.assert(auth);
  // 2. Create a new todo with all fields
  const createdTodo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: {
        title: "Test Todo for Restore",
        description: "This todo will be deleted and restored",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "todo initially not deleted",
    createdTodo.isDeleted,
    false,
  );
  // 3. Restore the todo from trash
  const restoredTodo = await api.functional.todoApp.user.trash.restore(
    userConnection,
    { todoId: createdTodo.id },
  );
  typia.assert(restoredTodo);
  // 4. Verify restoration - the todo should have isDeleted = false
  TestValidator.equals(
    "restored todo ID matches",
    restoredTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "restored todo is not deleted",
    restoredTodo.isDeleted,
    false,
  );
  TestValidator.equals(
    "restored todo title preserved",
    restoredTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "restored todo description preserved",
    restoredTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "restored todo isCompleted preserved",
    restoredTodo.isCompleted,
    createdTodo.isCompleted,
  );
  TestValidator.equals(
    "restored todo user matches",
    restoredTodo.user.id,
    createdTodo.user.id,
  );
}
