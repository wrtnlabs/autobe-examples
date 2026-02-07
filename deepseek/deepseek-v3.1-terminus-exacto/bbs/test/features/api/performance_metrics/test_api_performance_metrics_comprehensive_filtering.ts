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

export async function test_api_performance_metrics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test 1: Basic pagination with default sorting
  const basicResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicResult);
  TestValidator.predicate(
    "basic pagination returns data",
    basicResult.data.length >= 0,
  );
  TestValidator.equals("page number", basicResult.pagination.current, 1);
  TestValidator.predicate(
    "limit is valid",
    basicResult.pagination.limit <= 100,
  );
  // Test 2: Filter by registration date range
  const now = new Date();
  const oneMonthAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneWeekAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilterResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: oneMonthAgo,
          registration_date_end: oneWeekAgo,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  TestValidator.predicate(
    "date filter returns valid data",
    dateFilterResult.data.length >= 0,
  );
  // Test 3: Filter by minimum contributions
  const contributionFilterResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          min_comments: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          sort_by: "article_count",
          sort_order: "desc",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(contributionFilterResult);
  TestValidator.predicate(
    "contribution filter returns data",
    contributionFilterResult.data.length >= 0,
  );
  // Test 4: Sort by last activity
  const activitySortResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "last_activity",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(activitySortResult);
  TestValidator.predicate(
    "activity sort returns data",
    activitySortResult.data.length >= 0,
  );
  // Test 5: Maximum page limit
  const maxLimitResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals("maximum limit", maxLimitResult.pagination.limit, 100);
  // Test 6: Empty result set scenario with impossible filters
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            now.getTime() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Future date
          registration_date_end: new Date(
            now.getTime() + 366 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Further future date
          min_articles: 1000000, // Extremely high threshold
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty result set is valid",
    emptyResult.data.length === 0,
  );
  // Test 7: Combined filters with registration date sorting
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: oneMonthAgo,
          min_articles: 1,
          min_comments: 1,
          sort_by: "registration_date",
          sort_order: "asc",
          page: 2,
          limit: 8,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters return valid data",
    combinedResult.data.length >= 0,
  );
  TestValidator.equals(
    "page number for combined filters",
    combinedResult.pagination.current,
    2,
  );
}
