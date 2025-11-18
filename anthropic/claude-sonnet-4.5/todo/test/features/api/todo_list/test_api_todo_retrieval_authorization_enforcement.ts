import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the system enforces strict authorization by preventing users from
 * accessing todos that belong to other users.
 *
 * This E2E test validates the critical security requirement of user data
 * isolation in the todo list application. The system must ensure that todos can
 * only be accessed by their owner, preventing unauthorized access to other
 * users' data.
 *
 * Test workflow:
 *
 * 1. Create first user account (User A) and authenticate
 * 2. User A creates a todo item in their personal list
 * 3. Create second user account (User B) and authenticate (switching context)
 * 4. User B attempts to retrieve User A's todo by ID
 * 5. Verify the operation fails with authorization error
 *
 * This confirms that the backend properly validates the todo_list_user_id
 * against the authenticated user's ID from the JWT token, maintaining strict
 * data isolation between users.
 */
export async function test_api_todo_retrieval_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create first user (User A) who will own the todo
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  // Step 2: User A creates a todo item
  const todoCreatedByUserA: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(todoCreatedByUserA);

  // Step 3: Create second user (User B) and authenticate (this switches the JWT token in connection)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // Step 4 & 5: User B attempts to retrieve User A's todo - this should fail with authorization error
  await TestValidator.error("user B cannot access user A's todo", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todoCreatedByUserA.id,
    });
  });
}
