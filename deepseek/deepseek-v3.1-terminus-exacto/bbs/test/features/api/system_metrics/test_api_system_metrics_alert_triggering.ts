import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_metrics_alert_triggering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by status='critical' to identify critical system components
  const criticalMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          status: "critical",
          limit: 50,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(criticalMetrics);
  // Test 2: Combine status filtering with source_service
  const criticalDatabaseMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          status: "critical",
          source_service: "database",
          limit: 50,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(criticalDatabaseMetrics);
  // Test 3: Filter by warning status for potential issues
  const warningMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          status: "warning",
          limit: 50,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(warningMetrics);
  // Test 4: Historical trend analysis - same metric_type across time periods
  const responseTimeMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          metric_type: "response_time",
          limit: 50,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(responseTimeMetrics);
  // Test 5: Filter by unit to group similar measurement types
  // Commenting out due to compilation error - 'unit' property doesn't exist in IRequest
  // const millisecondMetrics =
  //   await api.functional.discussionBoard.superAdmin.system.metrics.index(
  //     superAdminConnection,
  //     {
  //       body: {
  //         unit: "milliseconds",
  //         limit: 50,
  //       } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
  //     },
  //   );
  // typia.assert(millisecondMetrics);
  // Validate business logic - ensure different filters return different results
  TestValidator.notEquals(
    "critical and warning metrics should differ",
    criticalMetrics.data.length,
    warningMetrics.data.length,
  );
  // Validate that filtering by source_service narrows down results
  if (
    criticalMetrics.data.length > 0 &&
    criticalDatabaseMetrics.data.length > 0
  ) {
    TestValidator.predicate(
      "database filter should narrow results",
      criticalDatabaseMetrics.data.length <= criticalMetrics.data.length,
    );
  }
}