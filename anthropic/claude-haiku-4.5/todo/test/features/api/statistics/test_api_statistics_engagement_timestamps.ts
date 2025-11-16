import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppEngagementStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEngagementStatistics";

export async function test_api_statistics_engagement_timestamps(
  connection: api.IConnection,
) {
  // Retrieve engagement statistics
  const statistics: ITodoAppEngagementStatistics =
    await api.functional.todoApp.statistics.engagement.index(connection);
  typia.assert(statistics);

  // Verify that the timestamp fields exist and are valid ISO 8601 strings
  TestValidator.predicate(
    "statistics_computed_at should be a valid ISO 8601 datetime string",
    typeof statistics.statistics_computed_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
        statistics.statistics_computed_at,
      ),
  );

  TestValidator.predicate(
    "data_period_start should be a valid ISO 8601 datetime string",
    typeof statistics.data_period_start === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statistics.data_period_start),
  );

  TestValidator.predicate(
    "data_period_end should be a valid ISO 8601 datetime string",
    typeof statistics.data_period_end === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(statistics.data_period_end),
  );

  // Parse timestamps for comparison
  const computedAt = new Date(statistics.statistics_computed_at).getTime();
  const periodStart = new Date(statistics.data_period_start).getTime();
  const periodEnd = new Date(statistics.data_period_end).getTime();

  // Verify temporal consistency: period_start < period_end
  TestValidator.predicate(
    "data_period_start should be before data_period_end",
    periodStart < periodEnd,
  );

  // Verify temporal consistency: computed_at >= period_end
  TestValidator.predicate(
    "statistics_computed_at should be equal to or after data_period_end",
    computedAt >= periodEnd,
  );

  // Verify that the computed timestamp is reasonable (within a few minutes of now)
  const now = new Date().getTime();
  const timeDifference = now - computedAt;
  TestValidator.predicate(
    "statistics_computed_at should be recent (within last 5 minutes)",
    timeDifference >= 0 && timeDifference <= 5 * 60 * 1000,
  );
}
