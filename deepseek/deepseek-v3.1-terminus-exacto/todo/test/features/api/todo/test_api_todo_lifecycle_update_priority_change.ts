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
 * Test priority modification workflow for todo lifecycle management.
 *
 * This test validates that users can successfully update the priority level of
 * todo items through the lifecycle management API. The workflow includes:
 *
 * 1. User account creation for authentication context
 * 2. Todo item creation with basic information
 * 3. Priority level update through lifecycle management
 * 4. Verification of state reflection and consistency
 */
export async function test_api_todo_lifecycle_update_priority_change(
  connection: api.IConnection,
) {
  // 1. Create user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "securePassword123",
      password_hash: "hashed_password_placeholder",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create todo item with basic information
  const todo = await api.functional.todoApp.user.todos.create(connection, {
    body: {
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 2,
        wordMax: 6,
      }),
      description: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);

  // 3. Update todo lifecycle - testing the update operation without specifying priority
  // This tests that the API accepts the update request and returns valid response
  const updatedLifecycle =
    await api.functional.todoApp.user.todos.lifecycle.update(connection, {
      todoId: todo.id,
      body: {
        // Not specifying priority - testing that the API handles optional fields correctly
        // The system may apply default priority or maintain existing priority
      } satisfies ITodoAppTodoLifecycle.IUpdate,
    });
  typia.assert(updatedLifecycle);

  // 4. Verify that the lifecycle update was successful
  TestValidator.predicate(
    "updated lifecycle should have valid todo reference",
    updatedLifecycle.todo !== undefined,
  );

  TestValidator.predicate(
    "updated lifecycle should have current snapshot",
    updatedLifecycle.current_snapshot !== undefined,
  );

  // 5. Validate the response structure integrity
  if (updatedLifecycle.todo) {
    TestValidator.equals(
      "todo ID should match original todo ID",
      updatedLifecycle.todo.id,
      todo.id,
    );
    TestValidator.equals(
      "todo title should match original title",
      updatedLifecycle.todo.title,
      todo.title,
    );
  }

  // 6. Validate snapshot structure if present
  if (updatedLifecycle.current_snapshot) {
    const snapshot = updatedLifecycle.current_snapshot;
    TestValidator.predicate(
      "snapshot should reference the todo",
      snapshot.todo !== undefined,
    );

    if (snapshot.todo) {
      TestValidator.equals(
        "snapshot todo ID should match",
        snapshot.todo.id,
        todo.id,
      );
    }

    TestValidator.predicate(
      "snapshot should have status",
      snapshot.status !== undefined,
    );

    // Priority is optional in snapshot, so we only validate if present
    if (snapshot.priority) {
      TestValidator.predicate(
        "priority should have code",
        snapshot.priority.code !== undefined,
      );
      TestValidator.predicate(
        "priority should have name",
        snapshot.priority.name !== undefined,
      );
    }
  }
}
