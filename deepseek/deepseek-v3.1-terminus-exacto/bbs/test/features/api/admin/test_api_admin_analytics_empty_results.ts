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
 * Test the analytics endpoint with filters that should return empty results.
 * This scenario validates edge cases where no metrics match the specified criteria,
 * such as extremely restrictive date ranges or high minimum thresholds.
 * The test verifies that the endpoint correctly handles empty result sets by
 * returning proper pagination metadata with zero records and appropriate page counts.
 */
export async function test_api_admin_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Test 1: Future date range (no metrics should exist)
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const analyticsFuture =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          registration_date_start: futureDate.toISOString(),
          registration_date_end: new Date(
            futureDate.getTime() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(), // +30 days
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(analyticsFuture);
  TestValidator.equals(
    "future date range should return zero records",
    analyticsFuture.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range should have zero pages",
    analyticsFuture.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date range should have empty data array",
    analyticsFuture.data.length,
    0,
  );
  // Test 2: Very high minimum article count threshold
  const analyticsHighArticles =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          min_articles: 10000,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(analyticsHighArticles);
  TestValidator.equals(
    "high article threshold should return zero records",
    analyticsHighArticles.pagination.records,
    0,
  );
  TestValidator.equals(
    "high article threshold should have zero pages",
    analyticsHighArticles.pagination.pages,
    0,
  );
  TestValidator.equals(
    "high article threshold should have empty data array",
    analyticsHighArticles.data.length,
    0,
  );
  // Test 3: Very high minimum comment count threshold
  const analyticsHighComments =
    await api.functional.discussionBoard.admin.analytics.index(
      adminConnection,
      {
        body: {
          min_comments: 10000,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(analyticsHighComments);
  TestValidator.equals(
    "high comment threshold should return zero records",
    analyticsHighComments.pagination.records,
    0,
  );
  TestValidator.equals(
    "high comment threshold should have zero pages",
    analyticsHighComments.pagination.pages,
    0,
  );
  TestValidator.equals(
    "high comment threshold should have empty data array",
    analyticsHighComments.data.length,
    0,
  );
}
