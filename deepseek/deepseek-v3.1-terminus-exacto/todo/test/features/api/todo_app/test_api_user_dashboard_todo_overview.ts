import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPriorityDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPriorityDistribution";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDashboard";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";

/**
 * Test comprehensive dashboard overview generation for authenticated user's
 * todo statistics.
 *
 * This test validates that the system correctly aggregates data from multiple
 * todo tables to provide accurate metrics including total todos, completed
 * todos, pending todos, priority distribution, completion rates, and upcoming
 * due dates. The test ensures proper authentication context and verifies that
 * dashboard calculations reflect the user's actual todo management status with
 * accurate statistical data.
 */
export async function test_api_user_dashboard_todo_overview(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword,
      status: "active" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: undefined,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create multiple todo items with different properties
  const todos: ITodoAppTodo[] = [];

  // Create a mix of todos with different properties
  const todoCount = 10;
  for (let i = 0; i < todoCount; i++) {
    const dueDate =
      i < 3
        ? new Date(Date.now() + 86400000 * (i + 1)).toISOString()
        : undefined;

    const todo = await api.functional.todoApp.user.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        description:
          i % 2 === 0
            ? RandomGenerator.content({
                paragraphs: 1,
                sentenceMin: 2,
                sentenceMax: 4,
              })
            : undefined,
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    });
    typia.assert(todo);
    todos.push(todo);
  }

  // Step 3: Retrieve dashboard overview
  const dashboard =
    await api.functional.todoApp.user.dashboard.todo_overview.dashboard(
      connection,
    );
  typia.assert(dashboard);

  // Step 4: Validate dashboard statistics
  TestValidator.equals(
    "total todos count matches created todos",
    dashboard.total_todos,
    todoCount,
  );

  // Validate basic statistics
  TestValidator.predicate(
    "pending todos should be non-negative",
    dashboard.pending_todos >= 0,
  );
  TestValidator.predicate(
    "completed todos should be non-negative",
    dashboard.completed_todos >= 0,
  );
  TestValidator.predicate(
    "in-progress todos should be non-negative",
    dashboard.in_progress_todos >= 0,
  );

  // Validate priority distribution structure
  TestValidator.predicate(
    "priority distribution low count should be non-negative",
    dashboard.priority_distribution.low >= 0,
  );
  TestValidator.predicate(
    "priority distribution medium count should be non-negative",
    dashboard.priority_distribution.medium >= 0,
  );
  TestValidator.predicate(
    "priority distribution high count should be non-negative",
    dashboard.priority_distribution.high >= 0,
  );

  // Validate completion rate is within bounds
  TestValidator.predicate(
    "completion rate should be between 0 and 100",
    dashboard.completion_rate >= 0 && dashboard.completion_rate <= 100,
  );

  // Validate upcoming due dates
  TestValidator.predicate(
    "upcoming due dates should be non-negative",
    dashboard.upcoming_due_dates >= 0,
  );

  // Validate average completion time
  TestValidator.predicate(
    "average completion time should be non-negative",
    dashboard.average_completion_time_hours >= 0,
  );

  // Validate recent completions
  TestValidator.predicate(
    "recent completions should be non-negative",
    dashboard.recent_completions >= 0,
  );

  // Validate overdue todos
  TestValidator.predicate(
    "overdue todos should be non-negative",
    dashboard.overdue_todos >= 0,
  );

  // Validate that all todo counts are consistent
  TestValidator.predicate(
    "total should equal sum of pending, in-progress, and completed",
    dashboard.total_todos ===
      dashboard.pending_todos +
        dashboard.in_progress_todos +
        dashboard.completed_todos,
  );

  // Validate that priority distribution sums to total todos
  const prioritySum =
    dashboard.priority_distribution.low +
    dashboard.priority_distribution.medium +
    dashboard.priority_distribution.high;
  TestValidator.equals(
    "priority distribution sum should equal total todos",
    prioritySum,
    dashboard.total_todos,
  );
}
