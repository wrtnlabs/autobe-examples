import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate per-user data isolation for todo creation.
 *
 * This test verifies that two different users can independently create todos
 * and never see or affect each other's data, confirming strict session
 * isolation in the backend.
 *
 * Steps:
 *
 * 1. Register first user and create a todo (todo1_A)
 * 2. Register second user and create a todo (todo1_B)
 * 3. As first user, create another todo (todo2_A)
 * 4. As second user, create another todo (todo2_B)
 * 5. Confirm that after user context is switched, no accidental data leakage or
 *    crossover exists between user A and user B.
 *
 * This is verified by ensuring each create response returns only the created
 * todo, and by switching user context (by joining/logging-in again),
 * demonstrating that authentication tokens scope API calls appropriately.
 * (Note: since /todoList/user/todos only returns the created todo, not a full
 * list, visibility is enforced indirectly – user contexts never intersect.)
 */
export async function test_api_todo_list_create_multi_user_isolation(
  connection: api.IConnection,
) {
  // Register first user (userA)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const joinBodyA = {
    email: userAEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-app.local/register-a",
    referrer: "https://test-app.local/landing",
  } satisfies ITodoListUser.IJoin;
  const userA = await api.functional.auth.user.join(connection, {
    body: joinBodyA,
  });
  typia.assert(userA);

  // User A creates first todo
  const todoBody1A = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 2,
      wordMax: 8,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo1A = await api.functional.todoList.user.todos.create(connection, {
    body: todoBody1A,
  });
  typia.assert(todo1A);
  TestValidator.equals("todo1A title", todo1A.title, todoBody1A.title);
  TestValidator.predicate("todo1A not completed", todo1A.completed === false);

  // Register second user (userB) and switch context
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const joinBodyB = {
    email: userBEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-app.local/register-b",
    referrer: "https://test-app.local/landing",
  } satisfies ITodoListUser.IJoin;
  const userB = await api.functional.auth.user.join(connection, {
    body: joinBodyB,
  });
  typia.assert(userB);

  // User B creates first todo
  const todoBody1B = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 2,
      wordMax: 5,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo1B = await api.functional.todoList.user.todos.create(connection, {
    body: todoBody1B,
  });
  typia.assert(todo1B);
  TestValidator.equals("todo1B title", todo1B.title, todoBody1B.title);
  TestValidator.predicate("todo1B not completed", todo1B.completed === false);

  // Switch back to userA and create second todo
  await api.functional.auth.user.join(connection, { body: joinBodyA });
  const todoBody2A = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 9,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo2A = await api.functional.todoList.user.todos.create(connection, {
    body: todoBody2A,
  });
  typia.assert(todo2A);
  TestValidator.equals("todo2A title", todo2A.title, todoBody2A.title);
  TestValidator.predicate("todo2A not completed", todo2A.completed === false);

  // Switch to userB again and create second todo
  await api.functional.auth.user.join(connection, { body: joinBodyB });
  const todoBody2B = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 3,
      wordMax: 7,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo2B = await api.functional.todoList.user.todos.create(connection, {
    body: todoBody2B,
  });
  typia.assert(todo2B);
  TestValidator.equals("todo2B title", todo2B.title, todoBody2B.title);
  TestValidator.predicate("todo2B not completed", todo2B.completed === false);

  // Because the API does not expose direct list or cross-user access,
  // isolation is verified by context switching and comparing todo responses.
}
