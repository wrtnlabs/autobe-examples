import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test data isolation between users in todo application.
 *
 * This test validates that the todo application properly isolates data between
 * different user accounts. Each user should only be able to view and search
 * their own todos, regardless of search criteria or filter combinations. Two
 * users are created with overlapping todo titles to ensure the system correctly
 * isolates data even when searching for common terms.
 *
 * Test Flow:
 *
 * 1. Create user A and authenticate
 * 2. Create todos for user A (some with common titles)
 * 3. Create user B and authenticate
 * 4. Create todos for user B (some with overlapping titles)
 * 5. Switch back to user A and verify searches return only their todos
 * 6. Switch to user B and verify searches return only their todos
 * 7. Test various search criteria to ensure isolation holds across all scenarios
 * 8. Verify no cross-user data leakage in any scenario
 */
export async function test_api_todo_list_data_isolation_between_users(
  connection: api.IConnection,
) {
  // Step 1: Create first user (User A)
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userAPassword = "SecurePassword123";
  const userA: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: userAPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(userA);

  // Step 2: Create todos for User A with common titles
  const commonTitle = "Important Project";
  const todoA1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: commonTitle,
        description: "User A specific project details",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA1);

  const todoA2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Shopping List",
        description: "User A shopping items",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA2);

  const todoA3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Meeting Notes",
        description: "User A meeting notes",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoA3);

  // Step 3: Create second user (User B)
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userBPassword = "AnotherSecure456";
  const userB: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: userBPassword,
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(userB);

  // Step 4: Create todos for User B with overlapping titles
  const todoB1: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: commonTitle,
        description: "User B specific project details",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB1);

  const todoB2: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Shopping List",
        description: "User B shopping items",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB2);

  const todoB3: ITodoAppTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Personal Goals",
        description: "User B personal goals",
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todoB3);

  // Step 5: Switch back to User A and verify data isolation
  await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.ICreate,
  });

  // Search all todos for User A (no filters)
  const userAAllTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userAAllTodos);

  TestValidator.equals(
    "User A should have exactly 3 todos",
    userAAllTodos.data.length,
    3,
  );

  const userAIds = new Set(userAAllTodos.data.map((t) => t.id));
  TestValidator.predicate(
    "User A todos list contains only User A todos",
    userAIds.has(todoA1.id) &&
      userAIds.has(todoA2.id) &&
      userAIds.has(todoA3.id),
  );

  // Search for common title as User A
  const userACommonTitleSearch: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title: commonTitle,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userACommonTitleSearch);

  TestValidator.equals(
    "User A search for common title returns only 1 result",
    userACommonTitleSearch.data.length,
    1,
  );
  TestValidator.equals(
    "User A search for common title returns correct todo ID",
    userACommonTitleSearch.data[0].id,
    todoA1.id,
  );

  // Search for partial title as User A
  const userAPartialSearch: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "Shopping",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userAPartialSearch);

  TestValidator.equals(
    "User A search for 'Shopping' returns only 1 result",
    userAPartialSearch.data.length,
    1,
  );
  TestValidator.equals(
    "User A search returns correct shopping todo",
    userAPartialSearch.data[0].id,
    todoA2.id,
  );

  // Step 6: Switch to User B and verify their data isolation
  await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: userBPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.ICreate,
  });

  // Search all todos for User B
  const userBAllTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userBAllTodos);

  TestValidator.equals(
    "User B should have exactly 3 todos",
    userBAllTodos.data.length,
    3,
  );

  const userBIds = new Set(userBAllTodos.data.map((t) => t.id));
  TestValidator.predicate(
    "User B todos list contains only User B todos",
    userBIds.has(todoB1.id) &&
      userBIds.has(todoB2.id) &&
      userBIds.has(todoB3.id),
  );

  TestValidator.predicate(
    "User B todos do not contain User A todos",
    !userBIds.has(todoA1.id) &&
      !userBIds.has(todoA2.id) &&
      !userBIds.has(todoA3.id),
  );

  // Search for common title as User B
  const userBCommonTitleSearch: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title: commonTitle,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userBCommonTitleSearch);

  TestValidator.equals(
    "User B search for common title returns only 1 result",
    userBCommonTitleSearch.data.length,
    1,
  );
  TestValidator.equals(
    "User B search for common title returns correct todo ID",
    userBCommonTitleSearch.data[0].id,
    todoB1.id,
  );

  // Search for shopping as User B
  const userBShoppingSearch: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        search: "Shopping",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userBShoppingSearch);

  TestValidator.equals(
    "User B search for 'Shopping' returns only 1 result",
    userBShoppingSearch.data.length,
    1,
  );
  TestValidator.equals(
    "User B search returns correct shopping todo",
    userBShoppingSearch.data[0].id,
    todoB2.id,
  );

  // Step 7: Additional search criteria tests to ensure complete isolation
  // Search by completion status as User B
  const userBIncompleteTodos: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        is_completed: false,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userBIncompleteTodos);

  TestValidator.equals(
    "User B incomplete todos count should be 3",
    userBIncompleteTodos.data.length,
    3,
  );

  TestValidator.predicate(
    "User B incomplete search does not return User A todos",
    !userBIncompleteTodos.data.map((t) => t.id).some((id) => userAIds.has(id)),
  );

  // Verify User A isolation persists
  await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: userAPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.ICreate,
  });

  const userAVerifyIsolation: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        is_completed: false,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(userAVerifyIsolation);

  TestValidator.equals(
    "User A incomplete todos count should be 3",
    userAVerifyIsolation.data.length,
    3,
  );

  TestValidator.predicate(
    "User A incomplete search does not return User B todos",
    !userAVerifyIsolation.data.map((t) => t.id).some((id) => userBIds.has(id)),
  );
}
