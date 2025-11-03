import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test complete todo retrieval workflow where a user creates a todo item and
 * then retrieves it by ID. Validates that users can only access their own todo
 * items, that the retrieved data matches the created data, and that all fields
 * including timestamps and status are correctly returned. Tests ownership
 * validation by ensuring users cannot access todos belonging to other users.
 */
export async function test_api_todo_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create first user account using todoApp auth register
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = "password123";

  const firstUser: ITodoAppUser =
    await api.functional.todoApp.auth.register.create(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create todo item for first user
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 8,
  });
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.users.todos.create(connection, {
      userId: firstUser.id,
      body: {
        title: todoTitle,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Validate initial todo state
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo status defaults to active",
    createdTodo.status,
    "active",
  );
  TestValidator.equals(
    "todo belongs to correct user",
    createdTodo.todo_app_user_id,
    firstUser.id,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    createdTodo.created_at !== null && createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    createdTodo.updated_at !== null && createdTodo.updated_at !== undefined,
  );
  TestValidator.equals(
    "completed_at is null for new todo",
    createdTodo.completed_at,
    undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    createdTodo.deleted_at,
    undefined,
  );

  // Step 3: Retrieve the created todo
  const retrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.users.todos.at(connection, {
      userId: firstUser.id,
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // Validate retrieved todo matches created todo
  TestValidator.equals(
    "retrieved todo ID matches created todo",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "retrieved todo status matches",
    retrievedTodo.status,
    createdTodo.status,
  );
  TestValidator.equals(
    "retrieved todo user ID matches",
    retrievedTodo.todo_app_user_id,
    createdTodo.todo_app_user_id,
  );
  TestValidator.equals(
    "retrieved todo created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "retrieved todo updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );

  // Step 4: Create second user using fresh connection to avoid authentication conflicts
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = "password456";

  const secondUserConnection: api.IConnection = { ...connection, headers: {} };

  const secondUser: ITodoAppUser =
    await api.functional.todoApp.auth.register.create(secondUserConnection, {
      body: {
        email: secondUserEmail,
        password: secondUserPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 5: Attempt to access first user's todo with second user's credentials (should fail)
  await TestValidator.error(
    "second user cannot access first user's todo",
    async () => {
      await api.functional.todoApp.user.users.todos.at(secondUserConnection, {
        userId: secondUser.id, // Second user's ID
        todoId: createdTodo.id, // First user's todo ID
      });
    },
  );

  // Step 6: Verify first user can still access their own todo
  const finalRetrievedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.users.todos.at(connection, {
      userId: firstUser.id,
      todoId: createdTodo.id,
    });
  typia.assert(finalRetrievedTodo);
  TestValidator.equals(
    "final retrieved todo ID matches",
    finalRetrievedTodo.id,
    createdTodo.id,
  );
}
