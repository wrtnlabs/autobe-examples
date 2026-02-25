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
 * Test the complete workflow of toggling completion status multiple times.
 * This test verifies that:
 * 1. Marking a todo as complete sets isCompleted to true and updates updatedAt
 * 2. Marking a todo as incomplete sets isCompleted to false and updates updatedAt
 * 3. The toggle operations can be performed repeatedly
 * 4. Each operation correctly refreshes the timestamp
 */
export async function test_api_todo_completion_status_toggle_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo for testing
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // Verify initial state - newly created todos are incomplete by default
  TestValidator.equals(
    "initial isCompleted should be false",
    todo.isCompleted,
    false,
  );
  // Store initial timestamp for comparison
  const initialUpdatedAt = todo.updatedAt;
  // 3. First toggle: Mark as complete
  const completedTodo = await api.functional.todoApp.user.todos.complete(
    userConnection,
    { todoId: todo.id },
  );
  typia.assert(completedTodo);
  TestValidator.equals(
    "first complete - isCompleted should be true",
    completedTodo.isCompleted,
    true,
  );
  TestValidator.predicate(
    "first complete - updatedAt should be refreshed",
    completedTodo.updatedAt !== initialUpdatedAt,
  );
  // 4. Second toggle: Mark as incomplete
  const incompleteTodo = await api.functional.todoApp.user.todos.incomplete(
    userConnection,
    { todoId: todo.id },
  );
  typia.assert(incompleteTodo);
  TestValidator.equals(
    "first incomplete - isCompleted should be false",
    incompleteTodo.isCompleted,
    false,
  );
  TestValidator.predicate(
    "first incomplete - updatedAt should be refreshed",
    incompleteTodo.updatedAt !== completedTodo.updatedAt,
  );
  // 5. Third toggle: Mark as complete again
  const completedAgainTodo = await api.functional.todoApp.user.todos.complete(
    userConnection,
    { todoId: todo.id },
  );
  typia.assert(completedAgainTodo);
  TestValidator.equals(
    "second complete - isCompleted should be true",
    completedAgainTodo.isCompleted,
    true,
  );
  TestValidator.predicate(
    "second complete - updatedAt should be refreshed",
    completedAgainTodo.updatedAt !== incompleteTodo.updatedAt,
  );
  // 6. Fourth toggle: Mark as incomplete again
  const incompleteAgainTodo =
    await api.functional.todoApp.user.todos.incomplete(userConnection, {
      todoId: todo.id,
    });
  typia.assert(incompleteAgainTodo);
  TestValidator.equals(
    "second incomplete - isCompleted should be false",
    incompleteAgainTodo.isCompleted,
    false,
  );
  TestValidator.predicate(
    "second incomplete - updatedAt should be refreshed",
    incompleteAgainTodo.updatedAt !== completedAgainTodo.updatedAt,
  );
}
