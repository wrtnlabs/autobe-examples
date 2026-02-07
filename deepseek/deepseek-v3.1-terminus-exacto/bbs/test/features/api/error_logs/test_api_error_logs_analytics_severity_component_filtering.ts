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

/**
 * Test error log analytics with severity and component-based filtering to validate targeted analysis capabilities.
 * The scenario should verify that a super administrator can filter errors by specific severity levels
 * (critical errors only, warnings only) and system components. Test combinations such as critical errors
 * in specific components, errors across multiple components, and severity distributions within components.
 * Validate that the grouping by error_type, severity, component, and environment provides meaningful insights
 * for debugging prioritization and system health monitoring.
 */
export async function test_api_error_logs_analytics_severity_component_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by critical severity only
  const criticalErrors =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          severities: ["critical"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(criticalErrors);
  // Test 2: Filter by warning severity only
  const warningErrors =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          severities: ["warning"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(warningErrors);
  // Test 3: Filter by multiple severity levels
  const multipleSeverities =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          severities: ["critical", "error", "warning"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(multipleSeverities);
  // Test 4: Filter by specific component
  const componentErrors =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          components: ["authentication", "database"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(componentErrors);
  // Test 5: Combined filtering by severity and component
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          severities: ["critical"],
          components: ["authentication"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Test 6: Empty filters (should return all errors)
  const allErrors =
    await api.functional.discussionBoard.superAdmin.error_logs.analytics.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(allErrors);
  // Validate that grouping works correctly
  if (criticalErrors.data.length > 0) {
    TestValidator.predicate(
      "critical errors have correct severity",
      criticalErrors.data.every((error) => error.severity === "critical"),
    );
  }
  if (warningErrors.data.length > 0) {
    TestValidator.predicate(
      "warning errors have correct severity",
      warningErrors.data.every((error) => error.severity === "warning"),
    );
  }
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    allErrors.pagination.current >= 0 &&
      allErrors.pagination.limit >= 0 &&
      allErrors.pagination.records >= 0 &&
      allErrors.pagination.pages >= 0,
  );
}
