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
 * Test data isolation to ensure users can only see their own todos.
 *
 * Two different users create separate todos with similar properties and each
 * attempts to retrieve their todo lists. Validates that query results
 * automatically filter by authenticated user ID, users cannot discover other
 * users' todos through any search or filter mechanism, and data isolation is
 * strictly enforced regardless of filter combinations applied.
 *
 * Steps:
 *
 * 1. Create first user account and register in the system
 * 2. Create first user's todo item with specific properties
 * 3. Create second user account with different email
 * 4. Create second user's todo item with similar properties
 * 5. Switch back to first user and query their todo list
 * 6. Verify first user sees only their own todo, not second user's todo
 * 7. Apply various filters and search combinations to first user's list
 * 8. Verify filters never reveal second user's todos
 * 9. Switch to second user and query their todo list
 * 10. Verify second user sees only their own todo, not first user's todo
 * 11. Test with multiple filter combinations and search terms
 * 12. Confirm data isolation is maintained across all query scenarios
 */
export async function test_api_todo_list_data_isolation_security(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail: string = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "SecurePassword123",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUser);
  TestValidator.equals(
    "first user created successfully",
    firstUser.email,
    firstUserEmail,
  );

  // Step 2: Create first user's todo item
  const firstUserTodoTitle = "First User Todo Task";
  const firstUserTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: firstUserTodoTitle,
        description: "This is the first user's todo item",
        priority: "high",
        due_date: "2025-12-31",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(firstUserTodo);
  TestValidator.equals(
    "first user todo created with correct title",
    firstUserTodo.title,
    firstUserTodoTitle,
  );
  TestValidator.equals(
    "first user todo belongs to first user",
    firstUserTodo.todo_app_user_id,
    firstUser.id,
  );

  // Step 3: Create second user account with different email
  const secondUserEmail: string = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "DifferentPassword456",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUser);
  TestValidator.notEquals(
    "second user has different ID than first user",
    secondUser.id,
    firstUser.id,
  );
  TestValidator.equals(
    "second user email is unique",
    secondUser.email,
    secondUserEmail,
  );

  // Step 4: Create second user's todo item with similar title structure
  const secondUserTodoTitle = "First User Todo Task"; // Same title as first user's todo to test filtering
  const secondUserTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: secondUserTodoTitle,
        description: "This is the second user's todo item",
        priority: "medium",
        due_date: "2025-12-31",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(secondUserTodo);
  TestValidator.equals(
    "second user todo created with same title",
    secondUserTodo.title,
    secondUserTodoTitle,
  );
  TestValidator.equals(
    "second user todo belongs to second user",
    secondUserTodo.todo_app_user_id,
    secondUser.id,
  );
  TestValidator.notEquals(
    "first and second user todos have different IDs",
    firstUserTodo.id,
    secondUserTodo.id,
  );

  // Step 5: Switch back to first user by re-authenticating
  const firstUserReauth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "SecurePassword123",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(firstUserReauth);
  TestValidator.equals(
    "first user re-authenticated with correct ID",
    firstUserReauth.id,
    firstUser.id,
  );

  // Step 6: Query first user's todo list without filters
  const firstUserListNoFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserListNoFilter);
  TestValidator.equals(
    "first user's list returns exactly 1 todo",
    firstUserListNoFilter.data.length,
    1,
  );
  TestValidator.equals(
    "first user's list contains their own todo",
    firstUserListNoFilter.data[0].id,
    firstUserTodo.id,
  );

  // Verify second user's todo is not in first user's list
  const firstUserIds = firstUserListNoFilter.data.map((t) => t.id);
  TestValidator.predicate(
    "second user's todo is not visible to first user",
    !firstUserIds.includes(secondUserTodo.id),
  );

  // Step 7: Test first user's list with title search - should only find their own
  const firstUserListTitleSearch: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title_search: "First User Todo Task",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserListTitleSearch);
  TestValidator.equals(
    "title search returns exactly 1 todo for first user",
    firstUserListTitleSearch.data.length,
    1,
  );
  TestValidator.equals(
    "title search returns first user's todo",
    firstUserListTitleSearch.data[0].id,
    firstUserTodo.id,
  );

  // Step 8: Test first user's list with status filter
  const firstUserListActiveFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        status: "active",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserListActiveFilter);
  TestValidator.equals(
    "status filter returns exactly 1 todo for first user",
    firstUserListActiveFilter.data.length,
    1,
  );
  TestValidator.equals(
    "status filter contains first user's todo",
    firstUserListActiveFilter.data[0].id,
    firstUserTodo.id,
  );

  // Step 9: Test first user's list with priority filter
  const firstUserListPriorityFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        priority: "high",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserListPriorityFilter);
  TestValidator.equals(
    "priority filter returns exactly 1 todo for first user",
    firstUserListPriorityFilter.data.length,
    1,
  );
  TestValidator.equals(
    "priority filter contains first user's high priority todo",
    firstUserListPriorityFilter.data[0].id,
    firstUserTodo.id,
  );

  // Step 10: Test first user's list with due date range filter
  const firstUserListDateFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        due_date_from: "2025-01-01",
        due_date_to: "2025-12-31",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserListDateFilter);
  TestValidator.equals(
    "date range filter returns exactly 1 todo for first user",
    firstUserListDateFilter.data.length,
    1,
  );
  TestValidator.equals(
    "date range filter contains first user's todo",
    firstUserListDateFilter.data[0].id,
    firstUserTodo.id,
  );

  // Step 11: Test combined filters - status + priority + date range
  const firstUserListCombinedFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        status: "active",
        priority: "high",
        due_date_from: "2025-01-01",
        due_date_to: "2025-12-31",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(firstUserListCombinedFilter);
  TestValidator.equals(
    "combined filters return exactly 1 todo for first user",
    firstUserListCombinedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "combined filters contain first user's todo",
    firstUserListCombinedFilter.data[0].id,
    firstUserTodo.id,
  );

  // Step 12: Switch to second user and verify their list isolation
  const secondUserReauth: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "DifferentPassword456",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(secondUserReauth);
  TestValidator.equals(
    "second user re-authenticated with correct ID",
    secondUserReauth.id,
    secondUser.id,
  );

  // Step 13: Query second user's todo list without filters
  const secondUserListNoFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(secondUserListNoFilter);
  TestValidator.equals(
    "second user's list returns exactly 1 todo",
    secondUserListNoFilter.data.length,
    1,
  );
  TestValidator.equals(
    "second user's list contains their own todo",
    secondUserListNoFilter.data[0].id,
    secondUserTodo.id,
  );

  // Verify first user's todo is not in second user's list
  const secondUserIds = secondUserListNoFilter.data.map((t) => t.id);
  TestValidator.predicate(
    "first user's todo is not visible to second user",
    !secondUserIds.includes(firstUserTodo.id),
  );

  // Step 14: Test second user's list with title search - should only find their own
  const secondUserListTitleSearch: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        title_search: "First User Todo Task",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(secondUserListTitleSearch);
  TestValidator.equals(
    "second user title search returns exactly 1 todo",
    secondUserListTitleSearch.data.length,
    1,
  );
  TestValidator.equals(
    "second user title search returns their own todo",
    secondUserListTitleSearch.data[0].id,
    secondUserTodo.id,
  );

  // Step 15: Test second user's list with status filter
  const secondUserListActiveFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        status: "active",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(secondUserListActiveFilter);
  TestValidator.equals(
    "second user status filter returns exactly 1 todo",
    secondUserListActiveFilter.data.length,
    1,
  );
  TestValidator.equals(
    "second user status filter contains their todo",
    secondUserListActiveFilter.data[0].id,
    secondUserTodo.id,
  );

  // Step 16: Test second user's list with priority filter (different priority from first user)
  const secondUserListPriorityFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        priority: "medium",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(secondUserListPriorityFilter);
  TestValidator.equals(
    "second user priority filter returns exactly 1 todo",
    secondUserListPriorityFilter.data.length,
    1,
  );
  TestValidator.equals(
    "second user priority filter contains their medium priority todo",
    secondUserListPriorityFilter.data[0].id,
    secondUserTodo.id,
  );

  // Step 17: Final verification - ensure no cross-user data leakage with complex query
  const secondUserComplexFilter: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        status: "active",
        priority: "high",
        title_search: "Task",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(secondUserComplexFilter);
  TestValidator.equals(
    "complex filter returns 0 todos (second user has no high priority)",
    secondUserComplexFilter.data.length,
    0,
  );
  TestValidator.predicate(
    "complex filter does not leak first user's high priority todo",
    !secondUserComplexFilter.data.some((t) => t.id === firstUserTodo.id),
  );
}
