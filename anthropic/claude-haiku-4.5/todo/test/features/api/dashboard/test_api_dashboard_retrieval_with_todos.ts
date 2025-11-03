import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppDashboard";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDashboardSummary";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_dashboard_retrieval_with_todos(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Create multiple active todos with various priorities and due dates
  const createdTodos: ITodoAppTodo[] = [];

  // Create 3 low priority todos
  for (let i = 0; i < 3; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `Low Priority Todo ${i + 1}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "low",
        due_date: new Date(new Date().getTime() + 86400000 * (i + 3))
          .toISOString()
          .split("T")[0],
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Create 2 medium priority todos
  for (let i = 0; i < 2; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `Medium Priority Todo ${i + 1}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Create 2 high priority todos
  for (let i = 0; i < 2; i++) {
    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: `High Priority Todo ${i + 1}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "high",
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    createdTodos.push(todo);
  }

  // Create 1 additional todo without priority (defaults to medium)
  const defaultPriorityTodo = await api.functional.todoApp.user.todos.create(
    connection,
    {
      body: {
        title: "Default Priority Todo",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(defaultPriorityTodo);
  createdTodos.push(defaultPriorityTodo);

  // Step 3: Retrieve the dashboard
  const dashboard: ITodoAppDashboard =
    await api.functional.todoApp.user.dashboard.index(connection);
  typia.assert(dashboard);

  // Step 4: Validate dashboard statistics

  // Validate total todos count (should be 8: 3 low + 2 medium + 2 high + 1 default)
  TestValidator.equals(
    "total todos count should equal all created todos",
    dashboard.total_todos_count,
    8,
  );

  // Validate active todos count (should be 8, all are active since none are completed)
  TestValidator.equals(
    "active todos count should match all created todos",
    dashboard.active_todos_count,
    8,
  );

  // Validate high priority todos count (should be 2)
  TestValidator.equals(
    "high priority todos count should match created high priority todos",
    dashboard.high_priority_todos_count,
    2,
  );

  // Validate completion rate (should be 0% since no todos are completed)
  TestValidator.equals(
    "completion rate should be 0 percent for new todos",
    dashboard.completion_rate_percentage,
    0,
  );

  // Validate completed today count (should be 0 since no todos are marked complete)
  TestValidator.equals(
    "completed today count should be 0 for newly created todos",
    dashboard.completed_today_count,
    0,
  );

  // Validate completed this week count (should be 0 since no todos are marked complete)
  TestValidator.equals(
    "completed this week count should be 0 for newly created todos",
    dashboard.completed_this_week_count,
    0,
  );

  // Validate overdue todos count (should be 0, all have future or no due dates)
  TestValidator.equals(
    "overdue todos count should be 0 for todos with future dates",
    dashboard.overdue_todos_count,
    0,
  );

  // Validate upcoming todos count (should be 3 - todos with future due dates)
  TestValidator.equals(
    "upcoming todos count should match todos with future due dates",
    dashboard.upcoming_todos_count,
    3,
  );

  // Validate recently added todos list is populated
  TestValidator.predicate(
    "recently added todos should be an array",
    Array.isArray(dashboard.recently_added_todos),
  );

  TestValidator.predicate(
    "recently added todos should not be empty",
    dashboard.recently_added_todos.length > 0,
  );

  // Validate recently completed todos list (should be empty)
  TestValidator.predicate(
    "recently completed todos should be an empty array",
    Array.isArray(dashboard.recently_completed_todos) &&
      dashboard.recently_completed_todos.length === 0,
  );

  // Validate first recently added todo contains expected fields
  const firstRecentTodo: ITodoAppTodoDashboardSummary =
    dashboard.recently_added_todos[0];
  typia.assert(firstRecentTodo);

  TestValidator.predicate(
    "recently added todo should have valid id",
    firstRecentTodo.id !== null && firstRecentTodo.id !== undefined,
  );

  TestValidator.predicate(
    "recently added todo should have non-empty title",
    firstRecentTodo.title !== null &&
      firstRecentTodo.title !== undefined &&
      firstRecentTodo.title.length > 0,
  );

  TestValidator.equals(
    "recently added todo should have active status",
    firstRecentTodo.status,
    "active",
  );

  TestValidator.predicate(
    "recently added todo should have valid priority",
    ["low", "medium", "high"].includes(firstRecentTodo.priority),
  );

  TestValidator.predicate(
    "recently added todo should have created_at timestamp",
    firstRecentTodo.created_at !== null &&
      firstRecentTodo.created_at !== undefined,
  );

  // Validate dashboard summary statistics
  TestValidator.predicate(
    "dashboard active todos count should be non-negative",
    dashboard.active_todos_count >= 0,
  );

  TestValidator.predicate(
    "dashboard completion rate should be between 0 and 100",
    dashboard.completion_rate_percentage >= 0 &&
      dashboard.completion_rate_percentage <= 100,
  );

  TestValidator.predicate(
    "dashboard total todos should equal active plus completed",
    dashboard.total_todos_count ===
      dashboard.active_todos_count +
        dashboard.completed_today_count +
        dashboard.completed_this_week_count,
  );
}
