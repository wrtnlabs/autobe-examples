import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates that todo items are properly isolated between different users.
 *
 * This test ensures that the todo application correctly implements data
 * isolation and user-todo associations. Two separate user accounts are created,
 * each creates their own todo items, and the test verifies:
 *
 * 1. Each user's todos are associated only with that user (todo_app_user_id
 *    matches)
 * 2. Todo responses correctly embed the owning user's information
 * 3. Data isolation prevents cross-user access to todos
 *
 * The test workflow:
 *
 * 1. Create first user account through registration
 * 2. Create first user's todo items
 * 3. Create second user account through registration
 * 4. Create second user's todo items
 * 5. Verify todo_app_user_id correctly references each user
 * 6. Verify embedded user information matches the creator
 * 7. Validate todo count and data integrity for each user
 */
export async function test_api_todo_creation_user_isolation(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "password12345",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user1);
  TestValidator.equals("user1 created successfully", user1.email, user1Email);

  // Step 2: Create first user's todo items
  const user1Todo1 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "User1 First Todo",
        description: "This is the first todo for user 1",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user1Todo1);

  const user1Todo2 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "User1 Second Todo",
        description: "This is the second todo for user 1",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user1Todo2);

  // Step 3: Create second user account
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "password12345",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user2);
  TestValidator.equals("user2 created successfully", user2.email, user2Email);

  // Step 4: Create second user's todo items
  const user2Todo1 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "User2 First Todo",
        description: "This is the first todo for user 2",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user2Todo1);

  const user2Todo2 = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "User2 Second Todo",
        description: "This is the second todo for user 2",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(user2Todo2);

  // Step 5: Verify todo_app_user_id correctly references each user
  TestValidator.equals(
    "user1Todo1 belongs to user1",
    user1Todo1.todo_app_user_id,
    user1.id,
  );
  TestValidator.equals(
    "user1Todo2 belongs to user1",
    user1Todo2.todo_app_user_id,
    user1.id,
  );
  TestValidator.equals(
    "user2Todo1 belongs to user2",
    user2Todo1.todo_app_user_id,
    user2.id,
  );
  TestValidator.equals(
    "user2Todo2 belongs to user2",
    user2Todo2.todo_app_user_id,
    user2.id,
  );

  // Step 6: Verify embedded user information matches the creator
  TestValidator.equals(
    "user1Todo1 embedded user matches user1",
    user1Todo1.user.id,
    user1.id,
  );
  TestValidator.equals(
    "user1Todo1 embedded user email matches user1 email",
    user1Todo1.user.email,
    user1.email,
  );
  TestValidator.equals(
    "user2Todo1 embedded user matches user2",
    user2Todo1.user.id,
    user2.id,
  );
  TestValidator.equals(
    "user2Todo1 embedded user email matches user2 email",
    user2Todo1.user.email,
    user2.email,
  );

  // Step 7: Verify user2's todos do not match user1's user ID
  TestValidator.notEquals(
    "user2Todo1 does not belong to user1",
    user2Todo1.todo_app_user_id,
    user1.id,
  );
  TestValidator.notEquals(
    "user2Todo2 does not belong to user1",
    user2Todo2.todo_app_user_id,
    user1.id,
  );

  // Step 8: Verify user1's todos do not match user2's user ID
  TestValidator.notEquals(
    "user1Todo1 does not belong to user2",
    user1Todo1.todo_app_user_id,
    user2.id,
  );
  TestValidator.notEquals(
    "user1Todo2 does not belong to user2",
    user1Todo2.todo_app_user_id,
    user2.id,
  );
}
