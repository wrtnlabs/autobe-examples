import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that authenticated users can successfully update their existing todo
 * items. This scenario validates the complete workflow of creating a user
 * account, creating a todo item, and then updating it with new title and status
 * information. The test ensures proper authentication verification, ownership
 * validation, and business rule enforcement including title length constraints
 * and valid status transitions.
 */
export async function test_api_todo_update_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.todoApp.auth.register.create(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create a todo item to be updated
  const initialTodoTitle = RandomGenerator.paragraph({ sentences: 3 });

  const createdTodo = await api.functional.todoApp.user.users.todos.create(
    connection,
    {
      userId: user.id,
      body: {
        title: initialTodoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdTodo);

  // Verify the todo was created correctly
  TestValidator.equals(
    "todo belongs to authenticated user",
    createdTodo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "todo title matches creation data",
    createdTodo.title,
    initialTodoTitle,
  );
  TestValidator.equals(
    "todo initial status is active",
    createdTodo.status,
    "active",
  );

  // Step 3: Update the todo item with new title and status
  const updatedTodoTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedStatus: ITodoAppTodoStatus = "completed";

  const updatedTodo = await api.functional.todoApp.user.users.todos.update(
    connection,
    {
      userId: user.id,
      todoId: createdTodo.id,
      body: {
        title: updatedTodoTitle,
        status: updatedStatus,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "todo ID remains unchanged",
    updatedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo still belongs to same user",
    updatedTodo.todo_app_user_id,
    user.id,
  );
  TestValidator.equals(
    "todo title was updated",
    updatedTodo.title,
    updatedTodoTitle,
  );
  TestValidator.equals(
    "todo status was updated",
    updatedTodo.status,
    updatedStatus,
  );
  TestValidator.predicate(
    "completed_at timestamp is set when status is completed",
    updatedTodo.completed_at !== null && updatedTodo.completed_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is newer than created_at",
    new Date(updatedTodo.updated_at) > new Date(createdTodo.updated_at),
  );

  // Step 5: Test partial updates (update only title)
  const partialUpdateTitle = RandomGenerator.paragraph({ sentences: 2 });

  const partiallyUpdatedTodo =
    await api.functional.todoApp.user.users.todos.update(connection, {
      userId: user.id,
      todoId: createdTodo.id,
      body: {
        title: partialUpdateTitle,
      } satisfies ITodoAppTodo.IUpdate,
    });
  typia.assert(partiallyUpdatedTodo);

  TestValidator.equals(
    "todo title was updated in partial update",
    partiallyUpdatedTodo.title,
    partialUpdateTitle,
  );
  TestValidator.equals(
    "todo status remains unchanged in partial update",
    partiallyUpdatedTodo.status,
    updatedStatus,
  );

  // Step 6: Test status transition back to active
  const reactivatedTodo = await api.functional.todoApp.user.users.todos.update(
    connection,
    {
      userId: user.id,
      todoId: createdTodo.id,
      body: {
        status: "active",
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(reactivatedTodo);

  TestValidator.equals(
    "todo status transitions back to active",
    reactivatedTodo.status,
    "active",
  );
  TestValidator.predicate(
    "completed_at is cleared when status changes to active",
    reactivatedTodo.completed_at === null ||
      reactivatedTodo.completed_at === undefined,
  );
}
