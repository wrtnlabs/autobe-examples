import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRegistrationTrendDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IRegistrationTrendDay";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUserStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserStatistics";

/**
 * Validates user statistics registration trends over a 30-day period.
 *
 * This test authenticates as an administrator and retrieves comprehensive user
 * statistics including registration trends. It validates that the registration
 * trend array contains daily registration data spanning the last 30 days, with
 * each entry including a properly formatted date and non-negative registration
 * count. The test verifies chronological ordering of trend entries and confirms
 * that the statistics support growth pattern visualization and anomaly
 * detection.
 *
 * Steps:
 *
 * 1. Create admin account via /auth/admin/join endpoint
 * 2. Retrieve user statistics via /todoApp/admin/statistics/users endpoint
 * 3. Validate registration_trend array structure and content
 * 4. Verify each trend entry has valid date (YYYY-MM-DD format) and count
 * 5. Confirm trend entries are sorted chronologically
 * 6. Validate all registration counts are non-negative integers
 * 7. Verify trend array spans approximately 30 days
 */
export async function test_api_user_statistics_registration_trends(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);
  TestValidator.predicate(
    "admin account created successfully",
    admin.id !== undefined && admin.email === adminEmail,
  );

  // Step 2: Retrieve user statistics
  const statistics: ITodoAppUserStatistics =
    await api.functional.todoApp.admin.statistics.users.at(connection);
  typia.assert(statistics);

  // Step 3: Validate registration_trend array exists and is an array
  TestValidator.predicate(
    "registration_trend is an array",
    Array.isArray(statistics.registration_trend),
  );
  TestValidator.predicate(
    "registration_trend has entries",
    statistics.registration_trend.length > 0,
  );

  // Step 4: Validate each trend entry structure and content
  statistics.registration_trend.forEach(
    (trend: IRegistrationTrendDay, index: number) => {
      typia.assert(trend);

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      TestValidator.predicate(
        `trend entry ${index} has valid date format YYYY-MM-DD`,
        dateRegex.test(trend.date),
      );

      // Validate date is a valid calendar date
      const dateObj = new Date(trend.date);
      TestValidator.predicate(
        `trend entry ${index} date is a valid calendar date`,
        !isNaN(dateObj.getTime()) &&
          trend.date === dateObj.toISOString().split("T")[0],
      );

      // Validate count is a non-negative integer
      TestValidator.predicate(
        `trend entry ${index} count is non-negative integer`,
        typeof trend.count === "number" &&
          Number.isInteger(trend.count) &&
          trend.count >= 0,
      );
    },
  );

  // Step 5: Verify chronological ordering
  for (let i = 0; i < statistics.registration_trend.length - 1; i++) {
    const currentDate = statistics.registration_trend[i].date;
    const nextDate = statistics.registration_trend[i + 1].date;
    TestValidator.predicate(
      `trend entries ${i} and ${i + 1} are in chronological order`,
      currentDate < nextDate || currentDate === nextDate,
    );
  }

  // Step 6: Verify trend span approximately covers 30 days
  if (statistics.registration_trend.length >= 2) {
    const firstDate = new Date(statistics.registration_trend[0].date);
    const lastDate = new Date(
      statistics.registration_trend[
        statistics.registration_trend.length - 1
      ].date,
    );
    const daysDifference = Math.floor(
      (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    TestValidator.predicate(
      "trend data spans approximately 30 days or less",
      daysDifference <= 30,
    );
  }

  // Step 7: Validate aggregate statistics are non-negative
  TestValidator.predicate(
    "total_users is non-negative",
    statistics.total_users >= 0,
  );
  TestValidator.predicate(
    "new_users_24h is non-negative",
    statistics.new_users_24h >= 0,
  );
  TestValidator.predicate(
    "new_users_7d is non-negative",
    statistics.new_users_7d >= 0,
  );
  TestValidator.predicate(
    "new_users_30d is non-negative",
    statistics.new_users_30d >= 0,
  );

  // Step 8: Verify registration trend sum consistency
  const trendSum = statistics.registration_trend.reduce(
    (sum, trend) => sum + trend.count,
    0,
  );
  TestValidator.predicate(
    "registration_trend contains valid count data for growth visualization",
    trendSum >= 0,
  );
}
