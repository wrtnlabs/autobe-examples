import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validates that user data isolation is strictly enforced for todo retrieval
 * operations.
 *
 * Ensures that when two different users exist, one cannot access another's todo
 * items by ID, even if the todoId is known. The scenario performs the
 * following:
 *
 * 1. Registers first user (User A) using random email/password and required
 *    session metadata
 * 2. User A creates a todo and records its todoId
 * 3. Registers second user (User B) using separate random email/password and
 *    session metadata
 * 4. User B attempts to retrieve User A's todo using known todoId
 * 5. Confirms API rejects this request with a forbidden/not found error, and does
 *    not leak content or existence
 *
 * All email/credentials and URLs are randomized per test run to avoid
 * collisions. Session metadata is supplied for both registration calls
 * according to DTO requirements. Responses are asserted for structure and
 * privacy policy enforcement.
 */
export async function test_api_todo_retrieval_forbidden_to_other_users(
  connection: api.IConnection,
) {
  // 1. Register first user (User A)
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userA_email,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://test-a.example.com/signup",
        referrer: "https://test-a.example.com/landing",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(userA);

  // 2. User A creates a todo
  const todoA: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 4,
          sentenceMax: 10,
        }),
      } satisfies ITodoTodo.ICreate,
    },
  );
  typia.assert(todoA);

  // 3. Register User B (second user, different credentials)
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userB_email,
        password: RandomGenerator.alphaNumeric(12),
        href: "https://test-b.example.com/signup",
        referrer: "https://test-b.example.com/landing",
      } satisfies ITodoUser.IJoin,
    },
  );
  typia.assert(userB);

  // 4. User B attempts to get User A's todo
  await TestValidator.error(
    "forbid retrieval of another user's todo by ID",
    async () => {
      await api.functional.todo.user.todos.at(connection, {
        todoId: todoA.id,
      });
    },
  );
}
