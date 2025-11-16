import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test that created todos are correctly associated with the authenticated user.
 *
 * Two users create todos with the same title, then verify that each todo is
 * correctly assigned to its creating user (via todo_app_user_id), that the user
 * summary in the response matches the authenticated user, and demonstrate that
 * the system correctly captures user ownership during creation.
 *
 * Test workflow:
 *
 * 1. Create first user account (user1)
 * 2. User1 creates a todo with a specific title
 * 3. Create second user account (user2)
 * 4. User2 creates a todo with the same title
 * 5. Verify user1's todo is correctly associated with user1
 * 6. Verify user2's todo is correctly associated with user2
 * 7. Verify todos have different owners despite identical titles
 * 8. Confirm user ownership is properly captured during creation
 */
export async function test_api_todo_creation_associates_with_authenticated_user(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1Password = RandomGenerator.alphabets(10);
  const user1Href = "http://localhost:3000/register";
  const user1Referrer = "http://localhost:3000";

  const user1Authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user1Email,
        password: user1Password,
        href: user1Href,
        referrer: user1Referrer,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(user1Authorized);
  typia.assert(user1Authorized.token);

  // Step 2: User1 creates a todo (while user1's token is in connection)
  const sharedTodoTitle = RandomGenerator.paragraph({ sentences: 2 });
  const user1TodoBody = {
    title: sharedTodoTitle,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoAppTodo.ICreate;

  const user1Todo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: user1TodoBody,
    });
  typia.assert(user1Todo);

  // Step 3: Create second user account
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = RandomGenerator.alphabets(10);
  const user2Href = "http://localhost:3000/register";
  const user2Referrer = "http://localhost:3000";

  const user2Authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: user2Email,
        password: user2Password,
        href: user2Href,
        referrer: user2Referrer,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(user2Authorized);
  typia.assert(user2Authorized.token);

  // Step 4: User2 creates a todo with the same title (while user2's token is in connection)
  const user2TodoBody = {
    title: sharedTodoTitle,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoAppTodo.ICreate;

  const user2Todo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: user2TodoBody,
    });
  typia.assert(user2Todo);

  // Step 5: Verify user1's todo is correctly associated with user1
  TestValidator.equals(
    "user1 todo should be associated with user1 via todo_app_user_id",
    user1Todo.todo_app_user_id,
    user1Authorized.id,
  );

  // Step 6: Verify user1's todo user summary matches user1's account
  TestValidator.equals(
    "user1 todo user summary id should match user1",
    user1Todo.user.id,
    user1Authorized.id,
  );
  TestValidator.equals(
    "user1 todo user summary email should match user1",
    user1Todo.user.email,
    user1Authorized.email,
  );

  // Step 7: Verify user2's todo is correctly associated with user2
  TestValidator.equals(
    "user2 todo should be associated with user2 via todo_app_user_id",
    user2Todo.todo_app_user_id,
    user2Authorized.id,
  );

  // Step 8: Verify user2's todo user summary matches user2's account
  TestValidator.equals(
    "user2 todo user summary id should match user2",
    user2Todo.user.id,
    user2Authorized.id,
  );
  TestValidator.equals(
    "user2 todo user summary email should match user2",
    user2Todo.user.email,
    user2Authorized.email,
  );

  // Step 9: Verify todos have different owners despite identical titles
  TestValidator.equals(
    "both todos should have same title",
    user1Todo.title,
    user2Todo.title,
  );
  TestValidator.notEquals(
    "todos should belong to different users",
    user1Todo.todo_app_user_id,
    user2Todo.todo_app_user_id,
  );

  // Step 10: Verify user ownership is properly captured
  TestValidator.predicate(
    "user1 todo should have user1's id in todo_app_user_id",
    user1Todo.todo_app_user_id === user1Authorized.id,
  );
  TestValidator.predicate(
    "user2 todo should have user2's id in todo_app_user_id",
    user2Todo.todo_app_user_id === user2Authorized.id,
  );
}
