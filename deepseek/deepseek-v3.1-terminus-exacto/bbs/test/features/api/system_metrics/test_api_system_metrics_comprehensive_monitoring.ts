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

export async function test_api_system_metrics_comprehensive_monitoring(
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
  // Test 1: Retrieve all metrics without filters
  const allMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(allMetrics);
  TestValidator.predicate(
    "should return paginated structure",
    allMetrics.pagination !== undefined && Array.isArray(allMetrics.data),
  );
  // Test 2: Filter by metric_type
  const responseTimeMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          metric_type: "response_time",
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(responseTimeMetrics);
  TestValidator.predicate(
    "should filter by metric_type",
    responseTimeMetrics.data.every(
      (metric) => metric.metric_type === "response_time",
    ) || responseTimeMetrics.data.length === 0,
  );
  // Test 3: Combine multiple filters
  const combinedFiltersMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          metric_type: "success_rate",
          source_service: "api_gateway",
          status: "healthy",
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(combinedFiltersMetrics);
  TestValidator.predicate(
    "should filter by multiple criteria",
    combinedFiltersMetrics.data.every(
      (metric) =>
        metric.metric_type === "success_rate" &&
        metric.source_service === "api_gateway" &&
        metric.status === "healthy",
    ) || combinedFiltersMetrics.data.length === 0,
  );
  // Test 4: Date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          start_timestamp: yesterday.toISOString(),
          end_timestamp: now.toISOString(),
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(dateRangeMetrics);
  // Test 5: Pagination validation
  const paginatedMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(paginatedMetrics);
  TestValidator.predicate(
    "should respect pagination limit",
    paginatedMetrics.data.length <= 5,
  );
  TestValidator.equals(
    "pagination metadata should match",
    paginatedMetrics.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current page should be 1",
    paginatedMetrics.pagination.current,
    1,
  );
  // Test different pagination parameters
  const secondPageMetrics =
    await api.functional.discussionBoard.superAdmin.system.metrics.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardSystemHealthMetric.IRequest,
      },
    );
  typia.assert(secondPageMetrics);
  TestValidator.equals(
    "second page should have current page 2",
    secondPageMetrics.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page should have limit 10",
    secondPageMetrics.pagination.limit,
    10,
  );
}
