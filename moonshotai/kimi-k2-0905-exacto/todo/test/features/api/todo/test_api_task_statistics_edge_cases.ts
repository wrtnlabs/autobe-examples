import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskMetric";
import type { ITodoAppTaskStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test task statistics endpoint with edge cases including empty task lists, all
 * completed tasks, all pending tasks, tasks with different priority
 * distributions, overdue tasks, and tasks due in different timeframes.
 * Validates that statistics calculation remains accurate and responsive even
 * with unusual data patterns, tests divide-by-zero scenarios (completion rate
 * when no tasks), and verifies proper handling of tasks with various due date
 * statuses (overdue, due today, due this week).
 */
export async function test_api_task_statistics_edge_cases(
  connection: api.IConnection,
) {
  // Step 1: Authenticate user to test statistics with edge case scenarios
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test empty task list statistics
  const emptyStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(emptyStats);

  TestValidator.equals(
    "empty task list total tasks count",
    emptyStats.total_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list active tasks count",
    emptyStats.active_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list completed tasks count",
    emptyStats.completed_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list pending tasks count",
    emptyStats.pending_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list completion rate when no tasks",
    emptyStats.completion_rate.value,
    0,
  );
  TestValidator.equals(
    "empty task list priority tasks all zero",
    emptyStats.high_priority_tasks.value +
      emptyStats.medium_priority_tasks.value +
      emptyStats.low_priority_tasks.value +
      emptyStats.no_priority_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list overdue tasks",
    emptyStats.overdue_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list due today tasks",
    emptyStats.due_today_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list due this week tasks",
    emptyStats.due_this_week_tasks.value,
    0,
  );
  TestValidator.equals(
    "empty task list average completion time",
    emptyStats.average_completion_time_days.value,
    0,
  );

  // Step 3: Create all completed tasks scenario
  const completedTasks = await ArrayUtil.asyncRepeat(5, async (index) =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Completed Task ${index + 1}`,
        status: "completed",
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  typia.assert(completedTasks);

  const allCompletedStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(allCompletedStats);

  TestValidator.equals(
    "all completed tasks total count",
    allCompletedStats.total_tasks.value,
    5,
  );
  TestValidator.equals(
    "all completed tasks completed count",
    allCompletedStats.completed_tasks.value,
    5,
  );
  TestValidator.equals(
    "all completed tasks pending count",
    allCompletedStats.pending_tasks.value,
    0,
  );
  TestValidator.equals(
    "all completed completion rate",
    allCompletedStats.completion_rate.value,
    1,
  );

  // Step 4: Create all pending tasks scenario
  const pendingTasks = await ArrayUtil.asyncRepeat(3, async (index) =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Pending Task ${index + 1}`,
        status: "pending",
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  typia.assert(pendingTasks);

  const mixedStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(mixedStats);

  TestValidator.equals(
    "mixed tasks total count",
    mixedStats.total_tasks.value,
    8,
  ); // 5 completed + 3 pending
  TestValidator.equals(
    "mixed tasks completed count",
    mixedStats.completed_tasks.value,
    5,
  );
  TestValidator.equals(
    "mixed tasks pending count",
    mixedStats.pending_tasks.value,
    3,
  );
  TestValidator.equals(
    "mixed tasks completion rate",
    mixedStats.completion_rate.value,
    5 / 8,
  );

  // Step 5: Test priority distribution
  const priorityTasks = await ArrayUtil.asyncRepeat(2, async () =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "High Priority Task",
        status: "pending",
        priority: "high",
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  await ArrayUtil.asyncRepeat(3, async () =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "Medium Priority Task",
        status: "pending",
        priority: "medium",
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  await ArrayUtil.asyncRepeat(1, async () =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "Low Priority Task",
        status: "pending",
        priority: "low",
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  await ArrayUtil.asyncRepeat(1, async () =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "No Priority Task",
        status: "pending",
        priority: null,
      } satisfies ITodoAppTask.ICreate,
    }),
  );

  const priorityStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(priorityStats);

  TestValidator.equals(
    "priority distribution high",
    priorityStats.high_priority_tasks.value,
    2,
  );
  TestValidator.equals(
    "priority distribution medium",
    priorityStats.medium_priority_tasks.value,
    3,
  );
  TestValidator.equals(
    "priority distribution low",
    priorityStats.low_priority_tasks.value,
    1,
  );
  TestValidator.equals(
    "priority distribution none",
    priorityStats.no_priority_tasks.value,
    3,
  ); // plus the original pending tasks

  // Step 6: Test overdue tasks
  const now = new Date();
  const overdueTasks = await ArrayUtil.asyncRepeat(2, async () =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "Overdue Task",
        status: "pending",
        due_date: new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 1 week ago
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  typia.assert(overdueTasks);

  const overdueStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(overdueStats);

  TestValidator.predicate(
    "overdue tasks count increased",
    overdueStats.overdue_tasks.value >= 2,
  );

  // Step 7: Test tasks due today
  const dueTodayTasks = await ArrayUtil.asyncRepeat(1, async () =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: "Due Today Task",
        status: "pending",
        due_date: now.toISOString(), // Today
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  typia.assert(dueTodayTasks);

  const dueTodayStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(dueTodayStats);

  TestValidator.predicate(
    "due today tasks count",
    dueTodayStats.due_today_tasks.value >= 1,
  );

  // Step 8: Test tasks due this week
  const dueThisWeekTasks = await ArrayUtil.asyncRepeat(3, async (index) =>
    api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: `Due This Week Task ${index + 1}`,
        status: "pending",
        due_date: new Date(
          now.getTime() + (index + 1) * 24 * 60 * 60 * 1000,
        ).toISOString(), // Tomorrow, 2 days, 3 days
      } satisfies ITodoAppTask.ICreate,
    }),
  );
  typia.assert(dueThisWeekTasks);

  const dueThisWeekStats =
    await api.functional.todoApp.user.tasks.statistics.at(connection);
  typia.assert(dueThisWeekStats);

  TestValidator.predicate(
    "due this week tasks count",
    dueThisWeekStats.due_this_week_tasks.value >= 3,
  );

  // Step 9: Test numerical edge cases in metrics
  TestValidator.predicate(
    "all metric values are non-negative integers",
    Object.values(overdueStats).every(
      (metric: ITodoAppTaskMetric) =>
        metric.value >= 0 && Number.isInteger(metric.value),
    ),
  );

  TestValidator.predicate(
    "completion rate is between 0 and 1 inclusive",
    overdueStats.completion_rate.value >= 0 &&
      overdueStats.completion_rate.value <= 1,
  );

  TestValidator.predicate(
    "total tasks equals sum of pending and completed",
    overdueStats.total_tasks.value ===
      overdueStats.pending_tasks.value + overdueStats.completed_tasks.value,
  );

  TestValidator.predicate(
    "average completion time is non-negative",
    overdueStats.average_completion_time_days.value >= 0,
  );

  // Step 10: Test monthly activity metrics
  TestValidator.predicate(
    "tasks created this month is non-negative",
    overdueStats.tasks_created_this_month.value >= 0,
  );

  TestValidator.predicate(
    "tasks completed this month is non-negative",
    overdueStats.tasks_completed_this_month.value >= 0,
  );
}
