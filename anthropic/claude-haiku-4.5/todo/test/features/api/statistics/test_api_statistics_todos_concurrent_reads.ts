import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppTodoStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatistics";
import type { ITodoCompletionTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCompletionTrendDay";
import type { ITodoCreationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoCreationTrendDay";

/**
 * Test that the statistics endpoint handles concurrent read requests correctly
 * and consistently.
 *
 * This test validates that multiple simultaneous requests to the statistics
 * endpoint return identical responses, ensuring that the statistics calculation
 * is atomic and does not exhibit race conditions or data inconsistencies due to
 * concurrent access.
 *
 * The test executes the following workflow:
 *
 * 1. Make 10 concurrent requests to the statistics endpoint
 * 2. Collect all responses and validate each one
 * 3. Compare all responses to ensure they are identical
 * 4. Verify statistical data integrity and proper type structure
 *
 * This validates that concurrent reads are properly synchronized and return
 * consistent data snapshots regardless of timing.
 */
export async function test_api_statistics_todos_concurrent_reads(
  connection: api.IConnection,
) {
  // Execute 10 concurrent requests to the statistics endpoint
  const concurrentRequestCount = 10;
  const statisticsPromises = ArrayUtil.repeat(concurrentRequestCount, () =>
    api.functional.todoApp.statistics.todos.index(connection),
  );

  // Wait for all concurrent requests to complete
  const responses: ITodoAppTodoStatistics[] =
    await Promise.all(statisticsPromises);

  // Validate each response
  responses.forEach((response, index) => {
    typia.assert(response);
    TestValidator.predicate(
      `response ${index} should have non-negative total todos count`,
      response.total_todos >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative completed todos count`,
      response.completed_todos >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative incomplete todos count`,
      response.incomplete_todos >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have valid completion rate percentage`,
      response.completion_rate_percent >= 0 &&
        response.completion_rate_percent <= 100,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative average todos per user`,
      response.average_todos_per_user >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative todos created today`,
      response.todos_created_today >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative todos created in 7 days`,
      response.todos_created_7d >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative todos created in 30 days`,
      response.todos_created_30d >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have valid creation trend array`,
      Array.isArray(response.creation_trend),
    );
    TestValidator.predicate(
      `response ${index} should have valid completion trend array`,
      Array.isArray(response.completion_trend),
    );
    TestValidator.predicate(
      `response ${index} should have valid most active creation hour`,
      response.most_active_creation_hour !== null &&
        response.most_active_creation_hour !== undefined,
    );
    TestValidator.predicate(
      `response ${index} should have valid most active creation day`,
      response.most_active_creation_day !== null &&
        response.most_active_creation_day !== undefined,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative todos completed today`,
      response.todos_completed_today >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative todos completed in 7 days`,
      response.todos_completed_7d >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative average completion time`,
      response.average_completion_time_days >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative longest incomplete todo days`,
      response.longest_incomplete_todo_days >= 0,
    );
    TestValidator.predicate(
      `response ${index} should have non-negative median todos per user`,
      response.median_todos_per_user >= 0,
    );
  });

  // Verify all responses are identical (consistent concurrent reads)
  const firstResponse = responses[0];
  responses.forEach((response, index) => {
    TestValidator.equals(
      `concurrent response ${index} should match first response`,
      response,
      firstResponse,
    );
  });

  // Verify sum of completed and incomplete equals total
  TestValidator.equals(
    "completed and incomplete todos should sum to total",
    firstResponse.completed_todos + firstResponse.incomplete_todos,
    firstResponse.total_todos,
  );

  // Verify temporal metrics are monotonically decreasing
  TestValidator.predicate(
    "todos created today should be <= todos created in 7 days",
    firstResponse.todos_created_today <= firstResponse.todos_created_7d,
  );

  TestValidator.predicate(
    "todos created in 7 days should be <= todos created in 30 days",
    firstResponse.todos_created_7d <= firstResponse.todos_created_30d,
  );

  TestValidator.predicate(
    "todos completed today should be <= todos completed in 7 days",
    firstResponse.todos_completed_today <= firstResponse.todos_completed_7d,
  );
}
