import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test filtering todos by priority level (low, medium, high) to help users
 * focus on urgent tasks.
 *
 * This test validates the priority filter parameter where users can view todos
 * of specific importance levels. It creates todos with each priority level
 * (low, medium, high) and some with null priority, then tests filtering for
 * each priority value individually and verifies correct subsets are returned.
 *
 * The test ensures that omitting the priority filter or passing null returns
 * todos of all priority levels, and validates that priority filtering combines
 * correctly with other filters like status and due dates. Finally, it ensures
 * the returned todo summaries accurately display their priority field values.
 *
 * Steps:
 *
 * 1. Authenticate as a user
 * 2. Create multiple todos with different priority levels (low, medium, high,
 *    null)
 * 3. Test filtering by priority="low" and verify only low-priority todos are
 *    returned
 * 4. Test filtering by priority="medium" and verify only medium-priority todos are
 *    returned
 * 5. Test filtering by priority="high" and verify only high-priority todos are
 *    returned
 * 6. Test filtering with priority=null and verify all todos are returned
 * 7. Test omitting priority filter and verify all todos are returned
 * 8. Test combining priority filter with status filter
 * 9. Test combining priority filter with due date filters
 * 10. Validate all returned todo summaries have correct priority values
 */
export async function test_api_todo_filter_by_priority_level(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as user
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create todos with different priority levels
  const lowPriorityTodos = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "low",
        status: "pending",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });
  typia.assert(lowPriorityTodos);

  const mediumPriorityTodos = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "medium",
        status: "pending",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });
  typia.assert(mediumPriorityTodos);

  const highPriorityTodos = await ArrayUtil.asyncRepeat(3, async () => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "high",
        status: "pending",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });
  typia.assert(highPriorityTodos);

  const nullPriorityTodos = await ArrayUtil.asyncRepeat(2, async () => {
    return await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: null,
        status: "pending",
        completed: false,
      } satisfies ITodoListTodo.ICreate,
    });
  });
  typia.assert(nullPriorityTodos);

  // Step 3: Test filtering by priority="low"
  const lowPriorityResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        priority: "low",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(lowPriorityResult);
  TestValidator.equals("low priority count", lowPriorityResult.data.length, 3);
  lowPriorityResult.data.forEach((todo) => {
    TestValidator.equals("priority is low", todo.priority, "low");
  });

  // Step 4: Test filtering by priority="medium"
  const mediumPriorityResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        priority: "medium",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(mediumPriorityResult);
  TestValidator.equals(
    "medium priority count",
    mediumPriorityResult.data.length,
    3,
  );
  mediumPriorityResult.data.forEach((todo) => {
    TestValidator.equals("priority is medium", todo.priority, "medium");
  });

  // Step 5: Test filtering by priority="high"
  const highPriorityResult = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        priority: "high",
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(highPriorityResult);
  TestValidator.equals(
    "high priority count",
    highPriorityResult.data.length,
    3,
  );
  highPriorityResult.data.forEach((todo) => {
    TestValidator.equals("priority is high", todo.priority, "high");
  });

  // Step 6: Test filtering with priority=null (should return all todos)
  const allTodosWithNullFilter = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        priority: null,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(allTodosWithNullFilter);
  TestValidator.predicate(
    "null priority filter returns all todos",
    allTodosWithNullFilter.data.length >= 11,
  );

  // Step 7: Test omitting priority filter (should return all todos)
  const allTodosWithoutFilter = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {} satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(allTodosWithoutFilter);
  TestValidator.predicate(
    "no priority filter returns all todos",
    allTodosWithoutFilter.data.length >= 11,
  );

  // Step 8: Test combining priority filter with status filter
  const highPriorityPendingTodos =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        priority: "high",
        status: "pending",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(highPriorityPendingTodos);
  highPriorityPendingTodos.data.forEach((todo) => {
    TestValidator.equals("combined filter priority", todo.priority, "high");
    TestValidator.equals("combined filter status", todo.status, "pending");
  });

  // Step 9: Test combining priority filter with due date filters
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const todoWithDueDate = await api.functional.todoList.user.todos.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        priority: "high",
        status: "pending",
        completed: false,
        due_date: futureDate,
      } satisfies ITodoListTodo.ICreate,
    },
  );
  typia.assert(todoWithDueDate);

  const combinedDatePriorityFilter =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        priority: "high",
        due_after: new Date(Date.now()).toISOString(),
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(combinedDatePriorityFilter);
  combinedDatePriorityFilter.data.forEach((todo) => {
    TestValidator.equals("date and priority filter", todo.priority, "high");
  });

  // Step 10: Validate final all todos query returns correct structure
  const finalAllTodos = await api.functional.todoList.user.todos.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListTodo.IRequest,
    },
  );
  typia.assert(finalAllTodos);
  TestValidator.predicate(
    "all todos returned with pagination",
    finalAllTodos.data.length >= 12,
  );
}
