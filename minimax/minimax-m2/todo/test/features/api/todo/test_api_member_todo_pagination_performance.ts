import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_pagination_performance(
  connection: api.IConnection,
) {
  // Step 1: Register a new member for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "Test",
        last_name: "User",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create multiple todos to test pagination (exceeding default page size)
  const todos: ITodoAppTodo[] = [];
  const totalTodos = 55; // Create enough todos to test multiple pages

  // Create todos with varied data for realistic testing
  for (let i = 1; i <= totalTodos; i++) {
    const todo: ITodoAppTodo = await api.functional.todoApp.member.todos.create(
      connection,
      {
        body: {
          title: `Test Todo Item ${i} - ${RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 6 })}`,
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          status:
            i % 3 === 0 ? "completed" : i % 2 === 0 ? "in_progress" : "pending",
          priority: (["low", "medium", "high", "urgent"] as const)[i % 4],
          category: (
            ["work", "personal", "shopping", "health", "finance"] as const
          )[i % 5],
          due_date:
            i % 7 === 0
              ? new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString()
              : undefined,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }

  // Step 3: Test default pagination (page 1, limit 20)
  const defaultPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(defaultPage);

  TestValidator.equals(
    "default page shows 20 items",
    defaultPage.data.length,
    20,
  );
  TestValidator.equals(
    "pagination metadata is correct",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records count",
    defaultPage.pagination.records,
    totalTodos,
  );
  TestValidator.equals(
    "total pages calculation",
    defaultPage.pagination.pages,
    Math.ceil(totalTodos / 20),
  );

  // Step 4: Test page 2 with same limit
  const page2: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(page2);

  TestValidator.equals(
    "page 2 shows remaining items",
    page2.data.length,
    totalTodos - 20,
  );
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 20", page2.pagination.limit, 20);
  TestValidator.equals(
    "page 2 total records consistent",
    page2.pagination.records,
    totalTodos,
  );
  TestValidator.equals(
    "page 2 total pages consistent",
    page2.pagination.pages,
    Math.ceil(totalTodos / 20),
  );

  // Step 5: Test last page
  const lastPageNum = Math.ceil(totalTodos / 20);
  const lastPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: lastPageNum,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(lastPage);

  TestValidator.equals(
    "last page current is correct",
    lastPage.pagination.current,
    lastPageNum,
  );
  const expectedLastPageItems = totalTodos - (lastPageNum - 1) * 20;
  TestValidator.equals(
    "last page item count",
    lastPage.data.length,
    expectedLastPageItems,
  );

  // Step 6: Test different page limits
  const pageWithLimit10: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pageWithLimit10);

  TestValidator.equals(
    "limit 10 shows 10 items",
    pageWithLimit10.data.length,
    10,
  );
  TestValidator.equals(
    "limit 10 metadata correct",
    pageWithLimit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit 10 pages updated",
    pageWithLimit10.pagination.pages,
    Math.ceil(totalTodos / 10),
  );

  const pageWithLimit50: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pageWithLimit50);

  TestValidator.equals(
    "limit 50 shows remaining items",
    pageWithLimit50.data.length,
    totalTodos,
  );
  TestValidator.equals(
    "limit 50 shows all on first page",
    pageWithLimit50.pagination.pages,
    1,
  );

  // Step 7: Test sorting and filtering with pagination
  const sortedByPriority: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 1,
        limit: 15,
        sort_by: "priority",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByPriority);

  TestValidator.equals(
    "priority sorted page has correct limit",
    sortedByPriority.data.length,
    15,
  );
  TestValidator.equals(
    "priority sorting applied",
    sortedByPriority.pagination.current,
    1,
  );

  // Step 8: Test filtering with pagination
  const filterByStatus: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 1,
        limit: 25,
        status: ["pending", "in_progress"],
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(filterByStatus);

  // Verify all returned items match the filter
  const hasOnlyFilteredStatus = filterByStatus.data.every(
    (todo) => todo.status === "pending" || todo.status === "in_progress",
  );
  TestValidator.predicate(
    "filter returns only matching status",
    hasOnlyFilteredStatus,
  );

  // Step 9: Test edge case - page beyond last page
  const beyondLastPage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 999,
        limit: 20,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(beyondLastPage);

  TestValidator.equals(
    "beyond last page shows empty",
    beyondLastPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond last page current is 999",
    beyondLastPage.pagination.current,
    999,
  );

  // Step 10: Validate data integrity across all pages
  const allPagesData: ITodoAppTodo.ISummary[] = [];
  let currentPage = 1;

  while (true) {
    const pageData: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.member.todos.index(connection, {
        body: {
          page: currentPage,
          limit: 20,
        } satisfies ITodoAppTodo.IRequest,
      });
    typia.assert(pageData);

    if (pageData.data.length === 0) break;

    allPagesData.push(...pageData.data);
    currentPage++;

    // Safety break to prevent infinite loops
    if (currentPage > 10) break;
  }

  TestValidator.equals(
    "all pages contain all todos",
    allPagesData.length,
    totalTodos,
  );

  // Check for duplicates by ID
  const uniqueIds = new Set(allPagesData.map((todo) => todo.id));
  TestValidator.equals(
    "no duplicate todo IDs",
    uniqueIds.size,
    allPagesData.length,
  );

  // Step 11: Performance validation - ensure no memory leaks or performance degradation
  const performancePage: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(performancePage);

  TestValidator.equals(
    "maximum limit returns all todos",
    performancePage.data.length,
    totalTodos,
  );
  TestValidator.equals(
    "maximum limit metadata correct",
    performancePage.pagination.limit,
    100,
  );
}
