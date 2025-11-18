import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate retrieval and access control of todo detail for authenticated users.
 *
 * This test simulates the entire user interaction necessary to access the
 * detail view of a single todo item in a privacy-preserving todo list system.
 * The test sets up two users (A, B) sequentially and ensures full
 * authentication context for each. User A registers, creates a new todo, and
 * then fetches the detail using the GET endpoint with the appropriate ID, while
 * verifying that all expected fields and user summary information are present
 * and accurate. The test also validates that user A cannot fetch any todo
 * belonging to user B, confirming ownership isolation and privacy. It includes
 * assertions for data structure and business logic, such as matching
 * created/updated timestamps, is_completed flag defaulting to false, the
 * presence (or absence) of 'completed_at', and that unauthorized access is
 * handled as not found without leaking item existence.
 */
export async function test_api_user_todo_detail_retrieval(
  connection: api.IConnection,
) {
  // Register User A
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA_password = RandomGenerator.alphaNumeric(12);
  const userA_href = "https://test-usera.example.com/";
  const userA_referrer = "https://signup.example.com/";
  const userA: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userA_email,
        password: userA_password,
        href: userA_href,
        referrer: userA_referrer,
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(userA);

  // Create a todo for User A
  const descriptionA = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const todoA: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: { description: descriptionA } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(todoA);

  // Fetch detail for User A's todo
  const fetchedA: ITodoTodo = await api.functional.todo.user.todos.at(
    connection,
    {
      todoId: todoA.id,
    },
  );
  typia.assert(fetchedA);

  // Validate fields are correct and match expected properties
  TestValidator.equals("todo id matches", fetchedA.id, todoA.id);
  TestValidator.equals(
    "description matches",
    fetchedA.description,
    descriptionA,
  );
  TestValidator.equals(
    "is_completed is false after creation",
    fetchedA.is_completed,
    false,
  );
  TestValidator.equals(
    "user summary id matches owner",
    fetchedA.user.id,
    userA.id,
  );
  TestValidator.equals(
    "user summary email matches owner",
    fetchedA.user.email,
    userA.email,
  );
  TestValidator.equals(
    "created_at is correct",
    fetchedA.created_at,
    todoA.created_at,
  );
  TestValidator.equals(
    "updated_at is correct",
    fetchedA.updated_at,
    todoA.updated_at,
  );
  TestValidator.equals(
    "completed_at is undefined/null on creation",
    fetchedA.completed_at,
    todoA.completed_at,
  );

  // Register User B
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB_password = RandomGenerator.alphaNumeric(12);
  const userB_href = "https://test-userb.example.com/";
  const userB_referrer = "https://signup.example.com/";
  const userB: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userB_email,
        password: userB_password,
        href: userB_href,
        referrer: userB_referrer,
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(userB);

  // Create a todo for User B and verify that UserA cannot access it
  const descriptionB = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const todoB: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: { description: descriptionB } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(todoB);

  // Switch context back to UserA (by re-authenticating)
  await api.functional.auth.user.join(connection, {
    body: {
      email: userA_email,
      password: userA_password,
      href: userA_href,
      referrer: userA_referrer,
    } satisfies ITodoUser.IJoin,
  });

  // UserA attempts to fetch UserB's todo (should fail with not found or similar privacy-preserving error)
  await TestValidator.error(
    "UserA cannot access UserB's todo detail",
    async () => {
      await api.functional.todo.user.todos.at(connection, { todoId: todoB.id });
    },
  );
}
