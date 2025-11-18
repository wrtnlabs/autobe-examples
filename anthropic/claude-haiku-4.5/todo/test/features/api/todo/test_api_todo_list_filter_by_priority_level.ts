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
 * Test filtering todos by priority level.
 *
 * This test validates that the todo list filtering API correctly retrieves
 * todos based on specific priority levels (low, medium, high) or returns all
 * todos when no priority filter is applied. The test creates a user account,
 * then creates multiple todos with different priority levels, and verifies that
 * filtering by each priority level returns only the todos with that priority,
 * and filtering without a priority parameter returns all todos.
 *
 * Steps:
 *
 * 1. Register a new user account
 * 2. Create multiple todos with different priority levels (low, medium, high)
 * 3. Test filtering by low priority - should return only low priority todos
 * 4. Test filtering by medium priority - should return only medium priority todos
 * 5. Test filtering by high priority - should return only high priority todos
 * 6. Test filtering with no priority parameter - should return all todos
 * 7. Validate that each filter returns the correct subset of todos
 */
export async function test_api_todo_list_filter_by_priority_level(
  connection: api.IConnection,
) {
  // Step 1: Register a new user account
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Create todos with different priority levels
  const priorities = ["low", "medium", "high"] as const;
  const todosByPriority: {
    low: ITodoListTodo[];
    medium: ITodoListTodo[];
    high: ITodoListTodo[];
  } = {
    low: [],
    medium: [],
    high: [],
  };

  // Create 3 todos for each priority level
  for (const priority of priorities) {
    for (let i = 0; i < 3; i++) {
      const todo: ITodoListTodo =
        await api.functional.todoList.user.todos.create(connection, {
          body: {
            title: `${priority} priority todo ${i + 1}`,
            description: `This is a ${priority} priority todo item`,
            priority: priority,
          } satisfies ITodoListTodo.ICreate,
        });
      typia.assert(todo);
      todosByPriority[priority].push(todo);
    }
  }

  // Step 3: Test filtering by low priority
  const lowPriorityResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        priority: "low",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(lowPriorityResult);
  TestValidator.equals(
    "low priority filter returns 3 todos",
    lowPriorityResult.data.length,
    3,
  );
  for (const todo of lowPriorityResult.data) {
    TestValidator.equals(
      "all filtered todos have low priority",
      todo.priority,
      "low",
    );
  }

  // Step 4: Test filtering by medium priority
  const mediumPriorityResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        priority: "medium",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(mediumPriorityResult);
  TestValidator.equals(
    "medium priority filter returns 3 todos",
    mediumPriorityResult.data.length,
    3,
  );
  for (const todo of mediumPriorityResult.data) {
    TestValidator.equals(
      "all filtered todos have medium priority",
      todo.priority,
      "medium",
    );
  }

  // Step 5: Test filtering by high priority
  const highPriorityResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {
        priority: "high",
      } satisfies ITodoListTodo.IRequest,
    });
  typia.assert(highPriorityResult);
  TestValidator.equals(
    "high priority filter returns 3 todos",
    highPriorityResult.data.length,
    3,
  );
  for (const todo of highPriorityResult.data) {
    TestValidator.equals(
      "all filtered todos have high priority",
      todo.priority,
      "high",
    );
  }

  // Step 6: Test filtering with no priority parameter (returns all todos)
  const allTodosResult: IPageITodoListTodo.ISummary =
    await api.functional.todoList.user.todos.index(connection, {
      body: {} satisfies ITodoListTodo.IRequest,
    });
  typia.assert(allTodosResult);
  TestValidator.equals(
    "no priority filter returns all 9 todos",
    allTodosResult.data.length,
    9,
  );

  // Step 7: Validate priority distribution in unfiltered results
  let lowCount = 0;
  let mediumCount = 0;
  let highCount = 0;

  for (const todo of allTodosResult.data) {
    if (todo.priority === "low") lowCount++;
    else if (todo.priority === "medium") mediumCount++;
    else if (todo.priority === "high") highCount++;
  }

  TestValidator.equals(
    "unfiltered results contain 3 low priority todos",
    lowCount,
    3,
  );
  TestValidator.equals(
    "unfiltered results contain 3 medium priority todos",
    mediumCount,
    3,
  );
  TestValidator.equals(
    "unfiltered results contain 3 high priority todos",
    highCount,
    3,
  );
}
