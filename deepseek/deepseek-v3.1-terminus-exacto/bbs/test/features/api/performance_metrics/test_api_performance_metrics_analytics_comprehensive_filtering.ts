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

/**
 * Test comprehensive filtering capabilities for performance metrics analytics.
 * 1. Authenticate as super administrator
 * 2. Test various filter combinations including date ranges, metric types, source components
 * 3. Validate pagination functionality with different page sizes
 * 4. Verify sorting by collection timestamp in both ascending and descending order
 * 5. Ensure response contains properly aggregated metrics for analytics dashboard
 */
export async function test_api_performance_metrics_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // The scenario plan references filtering capabilities that don't match the available DTO.
  // According to the provided DTO definitions, IDiscussionBoardPerformanceMetric.IRequest
  // contains filters for user statistics (registration dates, article counts, comment counts),
  // not system performance metrics (response_time, cpu_usage, etc.).
  //
  // However, the endpoint description mentions filtering by metric_type, source_component,
  // time_range, and collection_timestamp. Since these properties are not defined in the
  // available DTO, we must work with what's available in IDiscussionBoardPerformanceMetric.IRequest.
  //
  // This test will validate the filtering capabilities that ARE available in the DTO.
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using the provided utility function
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(auth);
  // Test 1: Basic filtering with date range using available DTO filters
  const basicFilters =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
          page: 1,
          limit: 10,
          sort_by: "last_activity",
          sort_order: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicFilters);
  TestValidator.predicate(
    "basic filters should return pagination data",
    basicFilters.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page should be valid",
    basicFilters.pagination.current >= 0,
  );
  // Test 2: Filter with minimum thresholds using available DTO filters
  const thresholdFilters =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          min_articles: 1,
          min_comments: 5,
          last_activity_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 5,
          sort_by: "article_count",
          sort_order: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(thresholdFilters);
  TestValidator.predicate(
    "threshold filters should return valid pagination",
    thresholdFilters.pagination.limit <= 100,
  );
  // Test 3: Pagination with different page sizes
  const paginationTest =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          limit: 20,
          page: 2,
          sort_by: "registration_date",
          sort_order: "asc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "limit should match request",
    paginationTest.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page should match request",
    paginationTest.pagination.current,
    2,
  );
  // Test 4: Different sorting combinations
  const ascendingSort =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "registration_date",
          sort_order: "asc",
          limit: 15,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(ascendingSort);
  const descendingSort =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "last_activity",
          sort_order: "desc",
          limit: 15,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(descendingSort);
  // Test 5: Complex combined filters
  const complexFilters =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_end: new Date().toISOString(),
          min_articles: 3,
          min_comments: 10,
          sort_by: "comment_count",
          sort_order: "desc",
          limit: 25,
          page: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(complexFilters);
  TestValidator.predicate(
    "complex filters should maintain pagination structure",
    complexFilters.pagination.records >= 0 &&
      complexFilters.pagination.pages >= 0,
  );
}
