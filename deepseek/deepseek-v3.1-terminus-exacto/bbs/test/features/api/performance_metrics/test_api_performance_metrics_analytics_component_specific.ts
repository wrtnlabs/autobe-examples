import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering performance metrics by available system parameters for platform monitoring.
 * This scenario validates that administrators can filter metrics using date ranges,
 * contribution thresholds, and pagination controls to analyze platform performance.
 */
export async function test_api_performance_metrics_analytics_component_specific(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic metrics retrieval without filters
  const basicMetrics =
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicMetrics);
  TestValidator.predicate(
    "basic metrics returns pagination",
    basicMetrics.pagination !== undefined,
  );
  TestValidator.predicate(
    "basic metrics returns data array",
    Array.isArray(basicMetrics.data),
  );
  // Test 2: Filter by date range
  const dateRangeMetrics =
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      adminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(dateRangeMetrics);
  // Test 3: Filter by contribution thresholds
  const thresholdMetrics =
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      adminConnection,
      {
        body: {
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          min_comments: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(thresholdMetrics);
  // Test 4: Filter with sorting
  const sortedMetrics =
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      adminConnection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortedMetrics);
  TestValidator.predicate(
    "sorted metrics has valid pagination",
    sortedMetrics.pagination.current === 1,
  );
  TestValidator.predicate(
    "sorted metrics has valid limit",
    sortedMetrics.pagination.limit === 10,
  );
  // Test 5: Complex filtering combination
  const complexMetrics =
    await api.functional.discussionBoard.admin.performance_metrics.analytics.index(
      adminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          min_articles: 1,
          sort_by: "last_activity",
          sort_order: "asc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(complexMetrics);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    typeof basicMetrics.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof basicMetrics.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records count",
    typeof basicMetrics.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages count",
    typeof basicMetrics.pagination.pages === "number",
  );
}
