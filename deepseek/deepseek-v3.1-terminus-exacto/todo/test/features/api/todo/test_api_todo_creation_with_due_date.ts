import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test todo creation with future due date specification.
 *
 * This test validates the complete workflow of creating a todo item with a
 * future due date. It ensures that the due date field properly accepts datetime
 * values, preserves the ISO 8601 format, and maintains timezone awareness
 * throughout the API interaction.
 *
 * Steps:
 *
 * 1. Register a new user account for authentication
 * 2. Create a todo item with title, description, and future due date
 * 3. Validate the response contains the correct due date
 * 4. Perform comprehensive type validation on the response
 * 5. Verify datetime format preservation and data integrity
 */
export async function test_api_todo_creation_with_due_date(
  connection: api.IConnection,
) {
  // 1. Register a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: "hashed_password_placeholder", // This will be handled by the API
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a todo item with future due date
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.paragraph({ sentences: 8 });

  const createdTodo = await api.functional.todos.create(connection, {
    body: {
      title: todoTitle,
      description: todoDescription,
      due_date: futureDate.toISOString(),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(createdTodo);

  // 3. Validate that the created todo contains the correct due date
  TestValidator.equals(
    "todo title should match input",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description should match input",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo due date should match input",
    createdTodo.due_date,
    futureDate.toISOString(),
  );

  // 4. Validate that the due date is in the future
  const dueDateTimestamp = new Date(createdTodo.due_date!).getTime();
  const currentTimestamp = Date.now();
  TestValidator.predicate(
    "due date should be in the future",
    dueDateTimestamp > currentTimestamp,
  );

  // 5. Validate the complete todo object structure
  TestValidator.predicate(
    "todo should have creation timestamp",
    createdTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "todo should have update timestamp",
    createdTodo.updated_at !== undefined,
  );
  TestValidator.equals(
    "todo should not be deleted",
    createdTodo.deleted_at,
    undefined,
  );
}
