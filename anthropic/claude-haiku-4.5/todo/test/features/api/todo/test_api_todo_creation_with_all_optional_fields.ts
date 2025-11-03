import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with complete information including title, description,
 * priority level, and future due date. User provides all available fields with
 * valid values. Validates that all fields are properly stored, optional fields
 * are persisted correctly, priority is set to specified value (not default),
 * due date is accepted if in future, system records creation timestamp and
 * initializes modification timestamp, and complete todo object is returned with
 * all provided fields.
 */
export async function test_api_todo_creation_with_all_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create todo with all optional fields provided
  // Calculate a future date (30 days from today)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateString = futureDate.toISOString().split("T")[0]; // YYYY-MM-DD format

  const todoCreationData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    priority: "high" as const,
    due_date: futureDateString,
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: todoCreationData,
    });
  typia.assert(createdTodo);

  // Step 3: Validate all fields are properly stored and returned
  TestValidator.equals(
    "todo title matches input",
    createdTodo.title,
    todoCreationData.title,
  );

  TestValidator.equals(
    "todo description matches input",
    createdTodo.description,
    todoCreationData.description,
  );

  TestValidator.equals(
    "todo priority is set to specified value not default",
    createdTodo.priority,
    "high",
  );

  TestValidator.equals(
    "todo due date matches input",
    createdTodo.due_date,
    futureDateString,
  );

  // Step 4: Validate initial status is 'active'
  TestValidator.equals(
    "todo initial status is active",
    createdTodo.status,
    "active",
  );

  // Step 5: Validate todo is associated with authenticated user
  TestValidator.equals(
    "todo belongs to authenticated user",
    createdTodo.todo_app_user_id,
    user.id,
  );

  // Step 6: Validate creation and modification timestamps are equal for new todo
  TestValidator.equals(
    "creation and modification timestamps are equal for new todo",
    createdTodo.created_at,
    createdTodo.updated_at,
  );

  // Step 7: Validate all optional fields were persisted when provided
  TestValidator.predicate(
    "optional description field was persisted",
    createdTodo.description === todoCreationData.description,
  );

  TestValidator.predicate(
    "optional due date field was persisted",
    createdTodo.due_date === futureDateString,
  );
}
