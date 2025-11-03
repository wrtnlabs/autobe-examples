import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_todo_creation_returns_complete_object_with_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated user account for the test
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Prepare todo creation data with title and optional fields
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const todoPriority = RandomGenerator.pick(["low", "medium", "high"] as const);

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: todoPriority,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Validate that response includes all required auto-generated fields

  // Verify ID is a valid UUID (already validated by typia.assert above)
  TestValidator.predicate(
    "todo id exists and is valid UUID",
    createdTodo.id.length > 0,
  );

  // Verify user_id matches the authenticated user
  TestValidator.equals(
    "todo user_id matches authenticated user",
    createdTodo.todo_app_user_id,
    user.id,
  );

  // Verify title matches input
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  // Verify description matches input
  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoDescription,
  );

  // Verify priority matches input
  TestValidator.equals(
    "todo priority matches input",
    createdTodo.priority,
    todoPriority,
  );

  // Verify status is set to 'active' for newly created todo
  TestValidator.equals(
    "todo status is active for new todo",
    createdTodo.status,
    "active",
  );

  // Verify created_at timestamp exists (already validated by typia.assert)
  TestValidator.predicate(
    "created_at timestamp is set",
    createdTodo.created_at.length > 0,
  );

  // Verify updated_at timestamp matches created_at initially
  TestValidator.equals(
    "updated_at matches created_at on creation",
    createdTodo.updated_at,
    createdTodo.created_at,
  );

  // Verify completed_at is null for newly created active todo
  TestValidator.equals(
    "completed_at is null for active todo",
    createdTodo.completed_at,
    null,
  );

  // Verify due_date is null when not provided
  TestValidator.equals(
    "due_date is null when not provided",
    createdTodo.due_date,
    null,
  );
}
