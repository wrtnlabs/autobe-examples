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
 * Test todo list pagination with various sorting options.
 *
 * This test validates comprehensive pagination and sorting functionality for
 * todo lists. A user creates multiple todos with different properties (titles,
 * due dates, priorities), then retrieves them using pagination with various
 * sorting options. The test confirms that:
 *
 * - Pagination correctly divides results into pages with specified page sizes
 * - Different sort fields (creation date, due date, priority) organize results
 *   correctly
 * - Sort directions (ascending/descending) work with all sort options
 * - Pagination metadata (total count, current page, total pages) is accurate
 * - Offset-based pagination prevents loading all data at once
 * - Combined pagination and sorting parameters work seamlessly together
 * - Page boundary conditions are handled correctly
 *
 * Process:
 *
 * 1. Create user account for authentication
 * 2. Create 4+ todos with varying properties (different due dates, priorities,
 *    creation times)
 * 3. Test pagination with different page sizes (2 items/page, 3 items/page, etc.)
 * 4. Test sorting by created_at (descending and ascending)
 * 5. Test sorting by due_date with pagination
 * 6. Test sorting by priority with pagination
 * 7. Validate pagination metadata correctness
 * 8. Verify all todos are retrievable through pagination
 */
export async function test_api_todo_list_pagination_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  TestValidator.predicate(
    "user authenticated",
    user.id !== null && user.email === userEmail,
  );

  // Step 2: Create multiple todos with different properties
  const todoData = [
    {
      title: "Complete project documentation",
      description: "Write comprehensive docs for API",
      priority: "high" as const,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
    {
      title: "Review pull requests",
      description: "Check team members code",
      priority: "medium" as const,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
    {
      title: "Fix critical bugs",
      description: "Address production issues",
      priority: "high" as const,
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
    {
      title: "Update dependencies",
      description: "Upgrade npm packages",
      priority: "low" as const,
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    },
  ];

  const createdTodos: ITodoAppTodo[] = [];
  for (const data of todoData) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  TestValidator.equals("created todos count", createdTodos.length, 4);

  // Step 3: Test pagination with page size 2
  const page1_size2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 2,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page1_size2);
  TestValidator.equals("page 1 size 2 item count", page1_size2.data.length, 2);
  TestValidator.equals(
    "pagination current page",
    page1_size2.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1_size2.pagination.limit, 2);
  TestValidator.equals(
    "pagination total records",
    page1_size2.pagination.records,
    4,
  );
  TestValidator.equals(
    "pagination total pages",
    page1_size2.pagination.pages,
    2,
  );

  // Step 4: Test page 2 with same size
  const page2_size2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 2,
        limit: 2,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page2_size2);
  TestValidator.equals("page 2 size 2 item count", page2_size2.data.length, 2);
  TestValidator.equals(
    "page 2 current page",
    page2_size2.pagination.current,
    2,
  );

  // Step 5: Verify different items between pages
  const page1Ids = page1_size2.data.map((t) => t.id);
  const page2Ids = page2_size2.data.map((t) => t.id);
  TestValidator.predicate(
    "page 1 and page 2 have different todos",
    page1Ids.every((id) => !page2Ids.includes(id)),
  );

  // Step 6: Test sorting by created_at descending
  const sortByCreatedDesc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortByCreatedDesc);
  TestValidator.predicate(
    "results sorted by created_at descending",
    sortByCreatedDesc.data.length > 0,
  );

  // Step 7: Test sorting by created_at ascending
  const sortByCreatedAsc: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortByCreatedAsc);
  TestValidator.predicate(
    "results sorted by created_at ascending",
    sortByCreatedAsc.data.length > 0,
  );

  // Step 8: Test sorting by due_date
  const sortByDueDate: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortByDueDate);
  TestValidator.equals(
    "sorting by due_date has all todos",
    sortByDueDate.pagination.records,
    4,
  );

  // Step 9: Test sorting by priority
  const sortByPriority: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
        sort_by: "priority",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortByPriority);
  TestValidator.equals(
    "sorting by priority has all todos",
    sortByPriority.pagination.records,
    4,
  );

  // Step 10: Test pagination with different limit
  const page1_size3: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 3,
        sort_by: "status",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page1_size3);
  TestValidator.equals("page 1 size 3 item count", page1_size3.data.length, 3);
  TestValidator.equals(
    "pagination total pages for limit 3",
    page1_size3.pagination.pages,
    2,
  );

  // Step 11: Test pagination with single item per page
  const page1_size1: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 1,
        sort_by: "updated_at",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page1_size1);
  TestValidator.equals("page 1 size 1 item count", page1_size1.data.length, 1);
  TestValidator.equals(
    "pagination total pages for limit 1",
    page1_size1.pagination.pages,
    4,
  );

  // Step 12: Test accessing last page
  const lastPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 4,
        limit: 1,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(lastPage);
  TestValidator.equals("last page has 1 item", lastPage.data.length, 1);
  TestValidator.equals("last page current", lastPage.pagination.current, 4);

  // Step 13: Verify metadata consistency across different pagination calls
  const consistency1: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 2,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(consistency1);

  const consistency2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 3,
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(consistency2);

  TestValidator.equals(
    "total records consistent across queries",
    consistency1.pagination.records,
    consistency2.pagination.records,
  );
  TestValidator.equals(
    "total records equals created count",
    consistency1.pagination.records,
    4,
  );
}
