import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_activities_statistics_empty_period(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for authentication
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create separate connection for statistics API call
  const statsConnection: api.IConnection = {
    host: connection.host,
    headers: { ...authConnection.headers },
  };
  // Define a very short future period where no activities could exist
  const now = new Date();
  const futureStartDate = new Date(now.getTime() + 1000).toISOString(); // 1 second in future
  const futureEndDate = new Date(now.getTime() + 2000).toISOString(); // 2 seconds in future
  // Call statistics endpoint with empty period
  const statistics =
    await api.functional.discussionBoard.superAdmin.system_activities.statistics(
      statsConnection,
      {
        body: {
          start_date: futureStartDate,
          end_date: futureEndDate,
          group_by: "daily",
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(statistics);
  // Validate empty period statistics
  TestValidator.equals(
    "total activities should be zero",
    statistics.total_activities,
    0,
  );
  TestValidator.equals(
    "success count should be zero",
    statistics.success_count,
    0,
  );
  TestValidator.equals("error count should be zero", statistics.error_count, 0);
  TestValidator.equals(
    "success rate should be zero for empty period",
    statistics.success_rate,
    0,
  );
  TestValidator.equals("period should be daily", statistics.period, "daily");
  TestValidator.equals(
    "start date should match input",
    statistics.start_date,
    futureStartDate,
  );
  TestValidator.equals(
    "end date should match input",
    statistics.end_date,
    futureEndDate,
  );
  // Validate period comparison structure for empty data
  TestValidator.predicate(
    "period comparison should exist",
    statistics.previous_period_comparison !== undefined,
  );
  TestValidator.equals(
    "total activities change should be zero for empty period",
    statistics.previous_period_comparison.total_activities_change,
    0,
  );
  TestValidator.equals(
    "success rate change should be zero for empty period",
    statistics.previous_period_comparison.success_rate_change,
    0,
  );
  TestValidator.predicate(
    "trend direction should be stable for empty period",
    statistics.previous_period_comparison.trend_direction === "stable",
  );
  // Explicitly validate success rate calculation handles division by zero
  TestValidator.predicate(
    "success rate should be 0 when total activities is 0",
    statistics.total_activities === 0 && statistics.success_rate === 0,
  );
}
