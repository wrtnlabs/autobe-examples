import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the todo retrieval operation enforces strict ownership
 * verification, ensuring users can only access their own todos.
 *
 * This test validates the critical security requirement that prevents
 * unauthorized access to other users' personal task data. The test creates two
 * separate user accounts, creates a todo item for the first user, then attempts
 * to retrieve that todo using the second user's authentication to verify that
 * access is denied with a 403 Forbidden error.
 *
 * Process:
 *
 * 1. Register and authenticate User A
 * 2. Create a todo item owned by User A
 * 3. Register and authenticate User B (switches authentication context)
 * 4. Attempt to retrieve User A's todo using User B's credentials
 * 5. Validate that the access is denied due to ownership verification failure
 */
export async function test_api_todo_retrieval_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate User A
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(userA);

  // Step 2: Create a todo item owned by User A
  const todoA: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 8,
        }),
        status: "incomplete",
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoA);

  // Step 3: Register and authenticate User B (this switches the authentication context)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.IRegister,
    },
  );
  typia.assert(userB);

  // Step 4 & 5: Attempt to retrieve User A's todo as User B - should fail with ownership error
  await TestValidator.error(
    "User B should not be able to access User A's todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: todoA.id,
      });
    },
  );
}
