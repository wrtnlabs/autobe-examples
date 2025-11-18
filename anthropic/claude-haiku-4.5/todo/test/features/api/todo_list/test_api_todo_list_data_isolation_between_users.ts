import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that todos are properly isolated between different user accounts.
 *
 * This test validates data isolation by creating two separate user accounts,
 * having each user create distinct todos, and verifying that when each user
 * retrieves their todo list, only their own todos appear. This ensures the
 * user_id field properly constrains queries to the authenticated user only,
 * preventing cross-contamination of data between users.
 *
 * Steps:
 *
 * 1. Create first user account (User A) via registration
 * 2. User A creates multiple todos with specific content
 * 3. Create second user account (User B) via registration
 * 4. User B creates different todos with unique content
 * 5. User A retrieves their todo list and verifies only their todos appear
 * 6. User B retrieves their todo list and verifies only their todos appear
 * 7. Verify no cross-contamination of data between the two users
 */
export async function test_api_todo_list_data_isolation_between_users(
  connection: api.IConnection,
) {
  // Step 1: Create User A account
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = RandomGenerator.alphabets(12);
  const userAAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userAEmail,
        password: userAPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userAAuth);

  // Step 2: User A creates todos with specific content
  const userATodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "User A Todo 1: Complete project report",
        description: "Finish the quarterly project report",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userATodo1);

  const userATodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: "User A Todo 2: Review code changes",
        description: "Review pull requests from team members",
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userATodo2);

  // Step 3: Create User B account with a fresh connection context
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = RandomGenerator.alphabets(12);
  const userBConnection: api.IConnection = { ...connection, headers: {} };
  const userBAuth: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(userBConnection, {
      body: {
        email: userBEmail,
        password: userBPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userBAuth);

  // Step 4: User B creates different todos
  const userBTodo1: ITodoListTodo =
    await api.functional.todoList.user.todos.create(userBConnection, {
      body: {
        title: "User B Todo 1: Grocery shopping",
        description: "Buy groceries for the week",
        priority: "low",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userBTodo1);

  const userBTodo2: ITodoListTodo =
    await api.functional.todoList.user.todos.create(userBConnection, {
      body: {
        title: "User B Todo 2: Gym workout",
        description: "Complete 1-hour gym session",
        priority: "medium",
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(userBTodo2);

  // Step 5: Retrieve todos as User A (use original connection with User A's token)
  const userATodoList: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userATodoList);

  // Verify User A only sees their todos
  TestValidator.equals(
    "User A todo list should contain exactly 2 todos",
    userATodoList.data.length,
    2,
  );

  const userATodoIds = new Set(userATodoList.data.map((t) => t.id));
  TestValidator.predicate(
    "User A's first todo should be in their list",
    userATodoIds.has(userATodo1.id),
  );
  TestValidator.predicate(
    "User A's second todo should be in their list",
    userATodoIds.has(userATodo2.id),
  );
  TestValidator.predicate(
    "User B's first todo should NOT be in User A's list",
    !userATodoIds.has(userBTodo1.id),
  );
  TestValidator.predicate(
    "User B's second todo should NOT be in User A's list",
    !userATodoIds.has(userBTodo2.id),
  );

  // Step 6: Retrieve todos as User B
  const userBTodoList: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(userBConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(userBTodoList);

  // Verify User B only sees their todos
  TestValidator.equals(
    "User B todo list should contain exactly 2 todos",
    userBTodoList.data.length,
    2,
  );

  const userBTodoIds = new Set(userBTodoList.data.map((t) => t.id));
  TestValidator.predicate(
    "User B's first todo should be in their list",
    userBTodoIds.has(userBTodo1.id),
  );
  TestValidator.predicate(
    "User B's second todo should be in their list",
    userBTodoIds.has(userBTodo2.id),
  );
  TestValidator.predicate(
    "User A's first todo should NOT be in User B's list",
    !userBTodoIds.has(userATodo1.id),
  );
  TestValidator.predicate(
    "User A's second todo should NOT be in User B's list",
    !userBTodoIds.has(userATodo2.id),
  );

  // Step 7: Final verification of data isolation
  TestValidator.predicate(
    "User A and User B todo lists should have no common todos",
    Array.from(userATodoIds).every((id) => !userBTodoIds.has(id)),
  );
}
