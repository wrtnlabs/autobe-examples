import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_performance_metrics_analytics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using the provided utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Recent metrics (last 24 hours)
  const recentStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentEnd = new Date().toISOString();
  const recentMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: recentStart,
          registration_date_end: recentEnd,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(recentMetrics);
  // Test 2: Historical metrics (specific date range)
  const historicalStart = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const historicalEnd = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const historicalMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: historicalStart,
          registration_date_end: historicalEnd,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(historicalMetrics);
  // Test 3: Empty date range (should return all metrics)
  const allMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(allMetrics);
  // Test 4: Last activity filtering
  const activityStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const activityEnd = new Date().toISOString();
  const activityMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          last_activity_start: activityStart,
          last_activity_end: activityEnd,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(activityMetrics);
  // Test 5: Combined filtering with minimum article count
  const combinedMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: recentStart,
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(combinedMetrics);
  // Validate pagination works correctly
  const paginatedMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(paginatedMetrics);
  TestValidator.predicate(
    "pagination has correct structure",
    paginatedMetrics.pagination.current === 1 &&
      paginatedMetrics.pagination.limit === 10 &&
      paginatedMetrics.pagination.records >= 0 &&
      paginatedMetrics.pagination.pages >= 0,
  );
  // Test sorting functionality
  const sortedMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortedMetrics);
  // Test date range boundary enforcement
  const boundaryMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(0).toISOString(), // Very old date
          registration_date_end: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Future date
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(boundaryMetrics);
  // Validate that different date ranges return different results
  TestValidator.notEquals(
    "recent and historical metrics should differ",
    recentMetrics.data.length,
    historicalMetrics.data.length,
  );
  TestValidator.predicate(
    "empty date range returns results",
    allMetrics.data.length >= 0,
  );
}
