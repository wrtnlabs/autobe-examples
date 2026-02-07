import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_error_logs_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Basic analytics without filters
  const basicAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  TestValidator.predicate(
    "basic analytics returns pagination",
    basicAnalytics.pagination !== undefined,
  );
  // Test 2: Filter by date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date().toISOString();
  const dateFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(dateFilteredAnalytics);
  TestValidator.predicate(
    "date filtered analytics returns data",
    dateFilteredAnalytics.data !== undefined,
  );
  // Test 3: Filter by error types
  const errorTypesFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          error_types: [
            "database_error",
            "authentication_error",
            "validation_error",
            "system_error",
          ],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(errorTypesFilteredAnalytics);
  TestValidator.predicate(
    "error types filtered analytics returns data",
    errorTypesFilteredAnalytics.data !== undefined,
  );
  // Test 4: Filter by severity levels
  const severityFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          severities: ["critical", "error", "warning", "info"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(severityFilteredAnalytics);
  TestValidator.predicate(
    "severity filtered analytics returns data",
    severityFilteredAnalytics.data !== undefined,
  );
  // Test 5: Filter by components
  const componentFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          components: ["database", "authentication", "validation", "api"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(componentFilteredAnalytics);
  TestValidator.predicate(
    "component filtered analytics returns data",
    componentFilteredAnalytics.data !== undefined,
  );
  // Test 6: Filter by environments
  const environmentFilteredAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          environments: ["development", "staging", "production"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(environmentFilteredAnalytics);
  TestValidator.predicate(
    "environment filtered analytics returns data",
    environmentFilteredAnalytics.data !== undefined,
  );
  // Test 7: Comprehensive filtering with all criteria
  const comprehensiveAnalytics =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate,
          end_date: endDate,
          error_types: ["database_error", "system_error"],
          severities: ["critical", "error"],
          components: ["database", "api"],
          environments: ["production"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(comprehensiveAnalytics);
  TestValidator.predicate(
    "comprehensive analytics returns pagination",
    comprehensiveAnalytics.pagination !== undefined,
  );
  TestValidator.predicate(
    "comprehensive analytics returns data",
    comprehensiveAnalytics.data !== undefined,
  );
  // Validate analytics data structure
  if (comprehensiveAnalytics.data.length > 0) {
    const sampleErrorLog = comprehensiveAnalytics.data[0];
    TestValidator.predicate(
      "error log has error_type",
      sampleErrorLog.error_type !== undefined,
    );
    TestValidator.predicate(
      "error log has severity",
      sampleErrorLog.severity !== undefined,
    );
    TestValidator.predicate(
      "error log has environment",
      sampleErrorLog.environment !== undefined,
    );
    TestValidator.predicate(
      "error log has error_count",
      sampleErrorLog.error_count !== undefined,
    );
    TestValidator.predicate(
      "error log has first_occurred_at",
      sampleErrorLog.first_occurred_at !== undefined,
    );
    TestValidator.predicate(
      "error log has last_occurred_at",
      sampleErrorLog.last_occurred_at !== undefined,
    );
    TestValidator.predicate(
      "error_count is positive",
      sampleErrorLog.error_count > 0,
    );
  }
}
