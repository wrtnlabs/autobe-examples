import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test todo creation with both required title and optional description fields.
 *
 * This test validates the complete todo creation workflow:
 *
 * 1. User registers and authenticates to establish authenticated context
 * 2. User creates a todo with a title (required) and description (optional)
 * 3. Verify the created todo includes all provided data
 * 4. Validate the todo is marked as incomplete
 * 5. Validate timestamps are properly set
 * 6. Ensure description is correctly stored without truncation
 *
 * The test covers the happy path where a user successfully creates a todo with
 * comprehensive information, validating that the API properly handles and
 * returns both required and optional fields.
 */
export async function test_api_todo_creation_with_title_and_description(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const authenticatedUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authenticatedUser);

  TestValidator.equals(
    "authenticated user email matches registration email",
    authenticatedUser.email,
    userEmail,
  );

  // Step 2: Create a todo with title and description
  const todoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 5,
  });
  const todoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 6,
  });

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Validate the created todo structure and data
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoTitle,
  );

  TestValidator.equals(
    "created todo description matches input",
    createdTodo.description,
    todoDescription,
  );

  TestValidator.predicate(
    "created todo title is within length constraints",
    createdTodo.title.length >= 1 && createdTodo.title.length <= 255,
  );

  TestValidator.predicate(
    "created todo description is within length constraints",
    createdTodo.description === null ||
      createdTodo.description === undefined ||
      createdTodo.description.length <= 2000,
  );

  // Step 4: Validate todo completion status
  TestValidator.equals(
    "newly created todo is marked as incomplete",
    createdTodo.is_completed,
    false,
  );

  TestValidator.equals(
    "newly created todo has no completion timestamp",
    createdTodo.completed_at,
    null,
  );

  // Step 5: Validate timestamps
  TestValidator.predicate(
    "created todo has valid created_at timestamp",
    createdTodo.created_at !== null &&
      createdTodo.created_at !== undefined &&
      new Date(createdTodo.created_at).getTime() > 0,
  );

  TestValidator.predicate(
    "created todo has valid updated_at timestamp",
    createdTodo.updated_at !== null &&
      createdTodo.updated_at !== undefined &&
      new Date(createdTodo.updated_at).getTime() > 0,
  );

  // Step 6: Validate todo ID and ownership
  TestValidator.predicate(
    "created todo has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdTodo.id,
    ),
  );

  TestValidator.equals(
    "created todo belongs to authenticated user",
    createdTodo.todo_app_user_id,
    authenticatedUser.id,
  );

  TestValidator.equals(
    "todo user summary matches authenticated user",
    createdTodo.user.id,
    authenticatedUser.id,
  );

  TestValidator.equals(
    "todo user email matches authenticated user email",
    createdTodo.user.email,
    authenticatedUser.email,
  );
}
