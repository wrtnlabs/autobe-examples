import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_priority_scheduling(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member for personal todo testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        status: "active",
        first_name: "Test",
        last_name: "Member",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create diverse todos with different priorities and due dates
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todos = await Promise.all([
    // Low priority with past due date
    api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Low Priority - Past Due",
        description: "Task with low priority that was due last week",
        priority: "low",
        due_date: lastWeek.toISOString(),
        status: "pending",
      } satisfies ITodoAppTodo.ICreate,
    }),
    // Medium priority with near due date
    api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Medium Priority - Due Tomorrow",
        description: "Standard priority task due tomorrow",
        priority: "medium",
        due_date: tomorrow.toISOString(),
        status: "pending",
      } satisfies ITodoAppTodo.ICreate,
    }),
    // High priority with future due date
    api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "High Priority - Due Next Week",
        description: "Important task with future deadline",
        priority: "high",
        due_date: nextWeek.toISOString(),
        status: "pending",
      } satisfies ITodoAppTodo.ICreate,
    }),
    // Urgent priority with no due date
    api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Urgent - No Due Date",
        description: "Critical task without specific deadline",
        priority: "urgent",
        status: "pending",
      } satisfies ITodoAppTodo.ICreate,
    }),
    // Medium priority with no due date
    api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Medium Priority - No Due Date",
        description: "Standard task without deadline",
        priority: "medium",
        status: "pending",
      } satisfies ITodoAppTodo.ICreate,
    }),
    // Low priority with future due date
    api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: "Low Priority - Future Due",
        description: "Low priority task with future deadline",
        priority: "low",
        due_date: nextWeek.toISOString(),
        status: "pending",
      } satisfies ITodoAppTodo.ICreate,
    }),
  ]);

  // Validate all todos were created
  todos.forEach((todo) => typia.assert(todo));
  TestValidator.equals("created 6 todos", todos.length, 6);

  // Step 3: Test filtering by individual priority levels
  const urgentTodos = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        priority: ["urgent"] as const,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(urgentTodos);
  TestValidator.equals(
    "urgent filtering returns 1 todo",
    urgentTodos.data.length,
    1,
  );
  TestValidator.equals(
    "urgent todo has correct priority",
    urgentTodos.data[0].priority,
    "urgent",
  );

  const highTodos = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        priority: ["high"] as const,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(highTodos);
  TestValidator.equals(
    "high filtering returns 1 todo",
    highTodos.data.length,
    1,
  );
  TestValidator.equals(
    "high todo has correct priority",
    highTodos.data[0].priority,
    "high",
  );

  // Step 4: Test filtering by multiple priorities
  const mediumHighTodos = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        priority: ["medium", "high"] as const,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(mediumHighTodos);
  TestValidator.equals(
    "medium+high filtering returns 2 todos",
    mediumHighTodos.data.length,
    2,
  );

  // Step 5: Test priority sorting (ascending - low to urgent)
  const todosByPriorityAsc = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        sort_by: "priority",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosByPriorityAsc);

  const priorityOrder = ["low", "medium", "high", "urgent"];
  let lastPriorityIndex = -1;
  for (const todo of todosByPriorityAsc.data) {
    const currentPriorityIndex = priorityOrder.indexOf(todo.priority);
    TestValidator.predicate(
      `priority ordering in ascending sort (${todo.priority})`,
      currentPriorityIndex >= lastPriorityIndex,
    );
    lastPriorityIndex = currentPriorityIndex;
  }

  // Step 6: Test priority sorting (descending - urgent to low)
  const todosByPriorityDesc = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        sort_by: "priority",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosByPriorityDesc);

  lastPriorityIndex = 999; // Start with high value
  for (const todo of todosByPriorityDesc.data) {
    const currentPriorityIndex = priorityOrder.indexOf(todo.priority);
    TestValidator.predicate(
      `priority ordering in descending sort (${todo.priority})`,
      currentPriorityIndex <= lastPriorityIndex,
    );
    lastPriorityIndex = currentPriorityIndex;
  }

  // Step 7: Test due date filtering - past dates
  const pastDueTodos = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        due_date_to: lastWeek.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(pastDueTodos);
  TestValidator.equals(
    "past due date filtering works",
    pastDueTodos.data.length,
    1,
  );

  // Step 8: Test due date filtering - future dates
  const futureDueTodos = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        due_date_from: tomorrow.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(futureDueTodos);
  TestValidator.equals(
    "future due date filtering works",
    futureDueTodos.data.length,
    3,
  );

  // Step 9: Test date range filtering
  const dateRangeTodos = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        due_date_from: lastWeek.toISOString(),
        due_date_to: nextWeek.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dateRangeTodos);
  TestValidator.equals(
    "date range filtering includes middle range",
    dateRangeTodos.data.length,
    3,
  );

  // Step 10: Test combined priority and date filtering
  const combinedFilter = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        priority: ["medium", "high"] as const,
        due_date_from: tomorrow.toISOString(),
        sort_by: "due_date",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filtering returns expected count",
    combinedFilter.data.length,
    2,
  );

  // Validate all returned todos match criteria
  for (const todo of combinedFilter.data) {
    TestValidator.predicate(
      `todo ${todo.id} has medium or high priority`,
      todo.priority === "medium" || todo.priority === "high",
    );
    if (todo.due_date) {
      TestValidator.predicate(
        `todo ${todo.id} has future due date`,
        new Date(todo.due_date) >= tomorrow,
      );
    }
  }

  // Step 11: Test sorting by due_date
  const todosByDueDate = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        sort_by: "due_date",
        sort_order: "asc",
        include_completed: true,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(todosByDueDate);

  // Check chronological ordering (null due_dates should come first or last based on implementation)
  let lastDate: Date | null = null;
  for (const todo of todosByDueDate.data) {
    if (todo.due_date) {
      const currentDate = new Date(todo.due_date);
      if (lastDate) {
        TestValidator.predicate(
          `due dates are in ascending order (${todo.title})`,
          currentDate >= lastDate,
        );
      }
      lastDate = currentDate;
    }
  }

  // Step 12: Test edge case - empty results
  const emptyResults = await api.functional.todoApp.member.todos.index(
    connection,
    {
      body: {
        priority: ["urgent"] as const,
        due_date_from: lastWeek.toISOString(),
        due_date_to: lastWeek.toISOString(),
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptyResults);
  TestValidator.equals(
    "edge case returns empty result",
    emptyResults.data.length,
    0,
  );

  // Step 13: Validate overall data integrity
  const allTodos = await api.functional.todoApp.member.todos.index(connection, {
    body: {
      include_completed: true,
    } satisfies ITodoAppTodo.IRequest,
  });
  typia.assert(allTodos);
  TestValidator.equals(
    "all created todos are retrievable",
    allTodos.data.length,
    6,
  );
}
