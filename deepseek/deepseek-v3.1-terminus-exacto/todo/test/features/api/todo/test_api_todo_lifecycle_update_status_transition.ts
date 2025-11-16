import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoLifecycle } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoLifecycle";
import type { ITodoAppTodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoPriority";
import type { ITodoAppTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoSnapshot";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test successful status transition workflow for todo lifecycle management.
 *
 * User creates a new todo item, then updates its lifecycle state by changing
 * the status from 'pending' to 'in-progress'. Validates that the lifecycle
 * update operation correctly modifies the todo's current state while
 * maintaining data integrity and proper status transition logic.
 */
export async function test_api_todo_lifecycle_update_status_transition(
  connection: api.IConnection,
) {
  // 1. Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      password_hash: "hashed_password_placeholder",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a todo item with initial pending status
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      due_date: new Date(Date.now() + 86400000).toISOString(),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // 3. Update the todo lifecycle status from 'pending' to 'in-progress'
  const updatedLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        status: {
          id: typia.random<string & tags.Format<"uuid">>(),
          code: "in-progress",
          name: "In Progress",
          is_active: true,
        } satisfies ITodoAppTodoStatus.ISummary,
        updated_at: new Date().toISOString(),
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(updatedLifecycle);

  // 4. Validate that the status transition was successful
  TestValidator.equals(
    "todo id should remain the same",
    updatedLifecycle.todo_app_todo_id,
    todo.id,
  );

  TestValidator.equals(
    "status should be updated to 'in-progress'",
    updatedLifecycle.current_snapshot?.status.code,
    "in-progress",
  );

  TestValidator.predicate(
    "updated at timestamp should be recent",
    Date.now() - new Date(updatedLifecycle.updated_at).getTime() < 5000,
  );
}
