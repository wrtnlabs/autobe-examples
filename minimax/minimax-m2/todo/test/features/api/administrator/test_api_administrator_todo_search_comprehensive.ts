import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_administrator_todo_search_comprehensive(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();

  const adminJoin: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: "securePassword123",
        first_name: "Test",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(adminJoin);

  // Step 2: Create administrator profile
  const administrator: ITodoAppAdministrator =
    await api.functional.todoApp.administrators.create(connection, {
      body: {
        email: adminEmail,
        password_hash: "securePassword123",
        first_name: "Test",
        last_name: "Administrator",
        role_level: "admin",
        status: "active",
      } satisfies ITodoAppAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 3: Create diverse todo items for comprehensive testing
  const currentDate = new Date();
  const tomorrow = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todos: ITodoAppTodo[] = [];

  // Create todos with different combinations of properties
  const todoConfigs = [
    {
      title: "High Priority Work Task",
      description: "Complete quarterly report for board meeting",
      status: "pending" as const,
      priority: "high" as const,
      category: "work",
      due_date: tomorrow.toISOString(),
    },
    {
      title: "Personal Shopping",
      description: "Buy groceries for the week",
      status: "in_progress" as const,
      priority: "medium" as const,
      category: "personal",
      due_date: nextWeek.toISOString(),
    },
    {
      title: "Urgent Project Deadline",
      description: "Submit project proposal by end of day",
      status: "completed" as const,
      priority: "urgent" as const,
      category: "work",
      completed_at: currentDate.toISOString(),
    },
    {
      title: "Low Priority Personal Task",
      description: "Organize photo gallery",
      status: "pending" as const,
      priority: "low" as const,
      category: "personal",
    },
    {
      title: "Medium Priority Task",
      description: "Review team performance metrics",
      status: "in_progress" as const,
      priority: "medium" as const,
      category: "work",
      due_date: tomorrow.toISOString(),
    },
    {
      title: "Shopping for Electronics",
      description: "Research and buy new laptop",
      status: "cancelled" as const,
      priority: "high" as const,
      category: "shopping",
    },
    {
      title: "Urgent Personal Task",
      description: "Call dentist to schedule appointment",
      status: "completed" as const,
      priority: "urgent" as const,
      category: "personal",
      completed_at: lastWeek.toISOString(),
    },
    {
      title: "Completed Work Task",
      description: "Update project documentation",
      status: "completed" as const,
      priority: "medium" as const,
      category: "work",
      completed_at: currentDate.toISOString(),
    },
  ];

  for (const config of todoConfigs) {
    const todo: ITodoAppTodo = await api.functional.todoApp.admin.todos.create(
      connection,
      {
        body: {
          title: config.title,
          description: config.description,
          status: config.status,
          business_status: "active",
          priority: config.priority,
          category: config.category,
          due_date: config.due_date,
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    todos.push(todo);
  }

  // Step 4: Test comprehensive search functionality

  // Test 1: Search by text content
  const textSearchResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        search: "quarterly report",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(textSearchResult);
  TestValidator.equals(
    "text search should find relevant todos",
    textSearchResult.data.length,
    1,
  );

  // Test 2: Filter by status
  const pendingStatusResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        status: ["pending"],
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(pendingStatusResult);
  const pendingTodos = todos.filter((t) => t.status === "pending");
  TestValidator.equals(
    "status filter should return correct pending todos",
    pendingStatusResult.data.length,
    pendingTodos.length,
  );

  // Test 3: Filter by priority
  const highPriorityResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        priority: ["high"],
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(highPriorityResult);
  const highPriorityTodos = todos.filter((t) => t.priority === "high");
  TestValidator.equals(
    "priority filter should return correct high priority todos",
    highPriorityResult.data.length,
    highPriorityTodos.length,
  );

  // Test 4: Filter by category
  const workCategoryResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        category: "work",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(workCategoryResult);
  const workTodos = todos.filter((t) => t.category === "work");
  TestValidator.equals(
    "category filter should return correct work todos",
    workCategoryResult.data.length,
    workTodos.length,
  );

  // Test 5: Filter by date range
  const dateRangeResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        date_from: lastWeek.toISOString(),
        date_to: nextWeek.toISOString(),
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dateRangeResult);
  const todosInDateRange = todos.filter((t) => {
    const createdDate = new Date(t.created_at);
    return createdDate >= lastWeek && createdDate <= nextWeek;
  });
  TestValidator.equals(
    "date range filter should return todos within range",
    dateRangeResult.data.length,
    todosInDateRange.length,
  );

  // Test 6: Filter by due date range
  const dueDateRangeResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        due_date_from: currentDate.toISOString(),
        due_date_to: nextWeek.toISOString(),
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dueDateRangeResult);
  const todosWithDueDates = todos
    .filter((t) => t.due_date)
    .filter((t) => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= currentDate && dueDate <= nextWeek;
    });
  TestValidator.equals(
    "due date range filter should return todos with due dates in range",
    dueDateRangeResult.data.length,
    todosWithDueDates.length,
  );

  // Test 7: Combined filters - status and priority
  const combinedFiltersResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        status: ["pending"],
        priority: ["high", "medium"],
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(combinedFiltersResult);
  const filteredByStatusAndPriority = todos.filter(
    (t) =>
      t.status === "pending" &&
      (t.priority === "high" || t.priority === "medium"),
  );
  TestValidator.equals(
    "combined status and priority filters should work correctly",
    combinedFiltersResult.data.length,
    filteredByStatusAndPriority.length,
  );

  // Test 8: Test sorting by different fields
  const sortedByPriority: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        sort_by: "priority",
        sort_order: "desc",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(sortedByPriority);
  TestValidator.equals(
    "should return todos sorted by priority",
    sortedByPriority.data.length,
    todos.length,
  );

  // Test 9: Test pagination
  const paginatedResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination should return correct number of items",
    paginatedResult.data.length,
    3,
  );
  TestValidator.equals(
    "pagination should return correct page number",
    paginatedResult.pagination.current,
    1,
  );

  // Test 10: Test excluding completed todos
  const activeTodosResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        include_completed: false,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(activeTodosResult);
  const activeTodos = todos.filter((t) => t.status !== "completed");
  TestValidator.equals(
    "excluding completed todos should work correctly",
    activeTodosResult.data.length,
    activeTodos.length,
  );

  // Test 11: Search with no matches
  const noMatchesResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        search: "nonexistent task that does not exist",
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(noMatchesResult);
  TestValidator.equals(
    "search with no matches should return empty results",
    noMatchesResult.data.length,
    0,
  );

  // Test 12: Complex multi-criteria search
  const complexSearchResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.admin.administrators.todos.index(connection, {
      administratorId: administrator.id,
      body: {
        status: ["pending", "in_progress"],
        priority: ["high", "urgent"],
        category: "work",
        date_from: lastWeek.toISOString(),
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(complexSearchResult);
  const complexFiltered = todos.filter(
    (t) =>
      (t.status === "pending" || t.status === "in_progress") &&
      (t.priority === "high" || t.priority === "urgent") &&
      t.category === "work" &&
      new Date(t.created_at) >= lastWeek,
  );
  TestValidator.equals(
    "complex multi-criteria search should work correctly",
    complexSearchResult.data.length,
    complexFiltered.length,
  );
}
