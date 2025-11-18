import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskCompletionRateStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskCompletionRateStatistics";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_completion_rate_time_analysis(
  connection: api.IConnection,
) {
  // Step 1: Create fresh user account for clean statistics
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testpassword123",
      href: "https://example.com",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create multiple tasks to test statistics calculation
  const tasks = await ArrayUtil.asyncRepeat(5, async () => {
    return await api.functional.todoApp.user.tasks.create(connection, {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: RandomGenerator.pick(["Low", "Medium", "High"] as const),
        due_date: RandomGenerator.date(
          new Date(),
          7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ITodoAppTask.ICreate,
    });
  });

  // Step 3: Get completion rate statistics for user with tasks
  const stats =
    await api.functional.todoApp.user.statistics.completion_rate.at(connection);
  typia.assert(stats);

  // Step 4: Validate basic statistics structure and calculations
  TestValidator.equals(
    "total tasks should match created count",
    stats.total_tasks,
    5,
  );
  TestValidator.equals(
    "completed tasks should be zero initially",
    stats.completed_tasks,
    0,
  );
  TestValidator.equals(
    "incomplete tasks should equal total",
    stats.incomplete_tasks,
    5,
  );
  TestValidator.equals(
    "completion rate should be zero for new user",
    stats.completion_rate_percent,
    0,
  );

  // Step 5: Validate timing fields exist but may be undefined for new user
  TestValidator.predicate(
    "average completion time should be undefined for no completions",
    stats.average_completion_time_days === undefined,
  );

  // Step 6: Validate calculation timestamp exists
  TestValidator.predicate(
    "calculation date should be present",
    stats.calculation_date !== undefined,
  );
  if (stats.calculation_date !== undefined) {
    TestValidator.predicate(
      "calculation date should be valid timestamp",
      new Date(stats.calculation_date) instanceof Date,
    );
    TestValidator.predicate(
      "calculation date should be recent",
      new Date(stats.calculation_date) <= new Date(),
    );
  }

  // Step 7: Validate streak information (may be undefined for new users)
  if (stats.streak_days !== undefined) {
    TestValidator.predicate(
      "streak days should be zero for new user",
      stats.streak_days === 0,
    );
  }

  if (stats.longest_streak_days !== undefined) {
    TestValidator.predicate(
      "longest streak should be zero for new user",
      stats.longest_streak_days === 0,
    );
  }

  // Step 8: Validate recent completion rate exists
  TestValidator.predicate(
    "recent completion rate should be defined",
    stats.recent_completion_rate_percent !== undefined,
  );
  if (stats.recent_completion_rate_percent !== undefined) {
    TestValidator.predicate(
      "recent completion rate should be zero for new user",
      stats.recent_completion_rate_percent === 0,
    );
  }

  // Step 9: Validate most productive day (may be undefined initially)
  if (stats.most_productive_day_of_week !== undefined) {
    TestValidator.predicate(
      "most productive day should be valid weekday",
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].includes(stats.most_productive_day_of_week),
    );
  }

  // Step 10: Validate all numeric ranges
  TestValidator.predicate(
    "total tasks should be non-negative",
    stats.total_tasks >= 0,
  );
  TestValidator.predicate(
    "completed tasks should be non-negative",
    stats.completed_tasks >= 0,
  );
  TestValidator.predicate(
    "incomplete tasks should be non-negative",
    stats.incomplete_tasks >= 0,
  );
  TestValidator.predicate(
    "completion rate should be in valid range",
    stats.completion_rate_percent >= 0 && stats.completion_rate_percent <= 100,
  );
}
