import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful creation of todo items for authenticated users.
 *
 * This test validates the complete todo creation workflow for authenticated
 * users, including user registration, authentication context establishment, and
 * todo creation with various inputs. The test verifies that todos are properly
 * created with correct initial state, timestamps, UUID identifiers, and user
 * associations.
 *
 * Test coverage includes:
 *
 * 1. User registration and authentication via join endpoint
 * 2. Todo creation with title only (minimal)
 * 3. Todo creation with title and description (comprehensive)
 * 4. Validation of response structure with all required fields
 * 5. Verification of initial todo state (is_completed=false, completed_at=null)
 * 6. Confirmation that created_at and updated_at match on creation
 * 7. Validation of business rule constraints (title length, description length)
 * 8. Verification that different users have separate todo ownership
 */
export async function test_api_todo_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user via join
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = "SecurePass123";
  const firstUserHref = "http://localhost:3000/register";
  const firstUserReferrer = "http://localhost:3000";

  const firstUserAuthorized = await api.functional.auth.user.join(connection, {
    body: {
      email: firstUserEmail,
      password: firstUserPassword,
      href: firstUserHref,
      referrer: firstUserReferrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(firstUserAuthorized);

  // Verify authentication token is set
  TestValidator.predicate(
    "first user authentication token is provided",
    !!firstUserAuthorized.token.access,
  );

  // Step 2: Create minimal todo (title only) for first user
  const minimalTodoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const minimalTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: minimalTodoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(minimalTodo);

  // Validate minimal todo response structure
  TestValidator.predicate(
    "minimal todo has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      minimalTodo.id,
    ),
  );
  TestValidator.equals(
    "minimal todo title matches",
    minimalTodo.title,
    minimalTodoTitle,
  );
  TestValidator.equals(
    "minimal todo is not completed",
    minimalTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "minimal todo completed_at is null",
    minimalTodo.completed_at,
    null,
  );
  TestValidator.predicate(
    "minimal todo has created_at timestamp",
    !!minimalTodo.created_at,
  );
  TestValidator.predicate(
    "minimal todo has updated_at timestamp",
    !!minimalTodo.updated_at,
  );
  TestValidator.equals(
    "minimal todo created_at and updated_at match on creation",
    minimalTodo.created_at,
    minimalTodo.updated_at,
  );
  TestValidator.equals(
    "minimal todo user id matches authenticated user",
    minimalTodo.todo_app_user_id,
    firstUserAuthorized.id,
  );
  TestValidator.equals(
    "minimal todo user email matches",
    minimalTodo.user.email,
    firstUserAuthorized.email,
  );

  // Step 3: Create comprehensive todo (title + description) for first user
  const comprehensiveTodoTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 2,
    wordMax: 7,
  });
  const comprehensiveTodoDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  }).substring(0, 2000); // Ensure within max length

  const comprehensiveTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: comprehensiveTodoTitle,
        description: comprehensiveTodoDescription,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(comprehensiveTodo);

  // Validate comprehensive todo response structure
  TestValidator.predicate(
    "comprehensive todo has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comprehensiveTodo.id,
    ),
  );
  TestValidator.equals(
    "comprehensive todo title matches",
    comprehensiveTodo.title,
    comprehensiveTodoTitle,
  );
  TestValidator.equals(
    "comprehensive todo description matches",
    comprehensiveTodo.description,
    comprehensiveTodoDescription,
  );
  TestValidator.equals(
    "comprehensive todo is not completed",
    comprehensiveTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "comprehensive todo completed_at is null",
    comprehensiveTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "comprehensive todo user id matches authenticated user",
    comprehensiveTodo.todo_app_user_id,
    firstUserAuthorized.id,
  );

  // Step 4: Create second user to verify separate todo ownership
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = "AnotherSecurePass456";
  const secondUserHref = "http://localhost:3000/register";
  const secondUserReferrer = "http://localhost:3000";

  const secondUserAuthorized = await api.functional.auth.user.join(connection, {
    body: {
      email: secondUserEmail,
      password: secondUserPassword,
      href: secondUserHref,
      referrer: secondUserReferrer,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(secondUserAuthorized);

  // Verify second user has different id
  TestValidator.notEquals(
    "second user has different id from first user",
    secondUserAuthorized.id,
    firstUserAuthorized.id,
  );

  // Step 5: Create todo for second user
  const secondUserTodoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const secondUserTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: secondUserTodoTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(secondUserTodo);

  // Verify second user's todo is separate from first user's todos
  TestValidator.notEquals(
    "second user todo id differs from first user todo id",
    secondUserTodo.id,
    minimalTodo.id,
  );
  TestValidator.equals(
    "second user todo belongs to second user",
    secondUserTodo.todo_app_user_id,
    secondUserAuthorized.id,
  );
  TestValidator.notEquals(
    "second user todo does not belong to first user",
    secondUserTodo.todo_app_user_id,
    firstUserAuthorized.id,
  );

  // Step 6: Test business rule constraints
  // Test title validation (max 255 characters)
  const maxLengthTitle = "a".repeat(255);
  const maxLengthTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: maxLengthTitle,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(maxLengthTodo);
  TestValidator.equals(
    "max length title is accepted",
    maxLengthTodo.title.length,
    255,
  );

  // Test description validation (max 2000 characters)
  const maxDescriptionLength = "b".repeat(2000);
  const maxDescriptionTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Todo with max description",
        description: maxDescriptionLength,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(maxDescriptionTodo);
  TestValidator.equals(
    "max length description is accepted",
    maxDescriptionTodo.description?.length,
    2000,
  );

  // Step 7: Test edge case - null description
  const nullDescriptionTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Todo with null description",
        description: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(nullDescriptionTodo);
  TestValidator.equals(
    "null description is handled correctly",
    nullDescriptionTodo.description,
    null,
  );
}
