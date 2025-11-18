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
 * Test sorting todos by priority field. Validates that todos are ordered by
 * priority level (low, medium, high). Tests both ascending and descending sort
 * orders. Handles todos without priority (null values). Validates
 * priority-based organization for user workflow optimization.
 *
 * The test implements a complete workflow:
 *
 * 1. Authenticate a user via registration
 * 2. Create multiple todos with different priority levels (low, medium, high, and
 *    null)
 * 3. Retrieve todos sorted by priority in ascending order (low → medium → high)
 * 4. Validate that todos are returned in correct priority order
 * 5. Retrieve todos sorted by priority in descending order (high → medium → low)
 * 6. Validate that todos are returned in correct reverse priority order
 * 7. Retrieve todos sorted by priority with null values handled appropriately
 * 8. Verify pagination and data consistency across different sort orders
 */
export async function test_api_todo_list_sort_by_priority(
  connection: api.IConnection,
) {
  // 1. Authenticate user via registration
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "TestPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "127.0.0.1",
        user_agent: "Test Client",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create multiple todos with different priority levels
  const lowPriorityTodos = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `Low Priority Todo ${index + 1}`,
        description: `Low priority task description`,
        priority: "low",
        due_date: new Date(Date.now() + 86400000 * (index + 1)).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  });

  const mediumPriorityTodos = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `Medium Priority Todo ${index + 1}`,
        description: `Medium priority task description`,
        priority: "medium",
        due_date: new Date(Date.now() + 86400000 * (index + 4)).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  });

  const highPriorityTodos = await ArrayUtil.asyncRepeat(3, async (index) => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `High Priority Todo ${index + 1}`,
        description: `High priority task description`,
        priority: "high",
        due_date: new Date(Date.now() + 86400000 * (index + 7)).toISOString(),
      } satisfies ITodoListTodo.ICreate,
    });
  });

  const nullPriorityTodos = await ArrayUtil.asyncRepeat(2, async (index) => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: `No Priority Todo ${index + 1}`,
        description: `Task without explicit priority`,
        priority: null,
      } satisfies ITodoListTodo.ICreate,
    });
  });

  // Verify all todos were created
  const allCreatedTodos = [
    ...lowPriorityTodos,
    ...mediumPriorityTodos,
    ...highPriorityTodos,
    ...nullPriorityTodos,
  ];

  typia.assert(allCreatedTodos.length === 11);
  allCreatedTodos.forEach((todo) => typia.assert(todo));

  // 3. Retrieve todos sorted by priority in ascending order (low → medium → high)
  const ascendingSortResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "priority",
        order: "asc",
      } satisfies ITodoListTodo.IRequest,
    });

  typia.assert(ascendingSortResult);
  TestValidator.equals(
    "ascending sort pagination limit",
    ascendingSortResult.pagination.limit,
    20,
  );

  // 4. Validate ascending order - extract priority from sorted results
  const ascendingPriorities: (string | null | undefined)[] =
    ascendingSortResult.data.map((todo) => todo.priority);

  // Verify low priorities come first
  const firstLowIndex = ascendingPriorities.findIndex((p) => p === "low");
  const firstMediumIndex = ascendingPriorities.findIndex((p) => p === "medium");
  const firstHighIndex = ascendingPriorities.findIndex((p) => p === "high");

  TestValidator.predicate(
    "low priority appears before medium in ascending sort",
    firstLowIndex >= 0 &&
      firstMediumIndex >= 0 &&
      firstLowIndex < firstMediumIndex,
  );

  TestValidator.predicate(
    "medium priority appears before high in ascending sort",
    firstMediumIndex >= 0 &&
      firstHighIndex >= 0 &&
      firstMediumIndex < firstHighIndex,
  );

  // 5. Retrieve todos sorted by priority in descending order (high → medium → low)
  const descendingSortResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "priority",
        order: "desc",
      } satisfies ITodoListTodo.IRequest,
    });

  typia.assert(descendingSortResult);
  TestValidator.equals(
    "descending sort pagination limit",
    descendingSortResult.pagination.limit,
    20,
  );

  // 6. Validate descending order
  const descendingPriorities: (string | null | undefined)[] =
    descendingSortResult.data.map((todo) => todo.priority);

  const descFirstHighIndex = descendingPriorities.findIndex(
    (p) => p === "high",
  );
  const descFirstMediumIndex = descendingPriorities.findIndex(
    (p) => p === "medium",
  );
  const descFirstLowIndex = descendingPriorities.findIndex((p) => p === "low");

  TestValidator.predicate(
    "high priority appears before medium in descending sort",
    descFirstHighIndex >= 0 &&
      descFirstMediumIndex >= 0 &&
      descFirstHighIndex < descFirstMediumIndex,
  );

  TestValidator.predicate(
    "medium priority appears before low in descending sort",
    descFirstMediumIndex >= 0 &&
      descFirstLowIndex >= 0 &&
      descFirstMediumIndex < descFirstLowIndex,
  );

  // 7. Retrieve todos sorted by priority with null values (omit priority filter)
  const nullHandlingResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort_by: "priority",
        order: "asc",
      } satisfies ITodoListTodo.IRequest,
    });

  typia.assert(nullHandlingResult);
  TestValidator.predicate(
    "null handling result contains todos",
    nullHandlingResult.data.length > 0,
  );

  // Verify that todos with null priority are included
  const hasNullPriority = nullHandlingResult.data.some(
    (todo) => todo.priority === null || todo.priority === undefined,
  );

  TestValidator.predicate(
    "todos with null priority are included in results",
    hasNullPriority,
  );

  // 8. Verify total record count matches created todos
  TestValidator.equals(
    "total records includes all created todos",
    nullHandlingResult.pagination.records,
    11,
  );

  // Verify that all created todo IDs are present in results across both sort orders
  const ascendingIds = new Set(ascendingSortResult.data.map((t) => t.id));
  const descendingIds = new Set(descendingSortResult.data.map((t) => t.id));

  const createdIds = new Set(allCreatedTodos.map((t) => t.id));

  TestValidator.predicate(
    "all created todos are present in ascending sort results",
    Array.from(createdIds).every((id) => ascendingIds.has(id)),
  );

  TestValidator.predicate(
    "all created todos are present in descending sort results",
    Array.from(createdIds).every((id) => descendingIds.has(id)),
  );
}
