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

export async function test_api_superadmin_analytics_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Test 1: Basic analytics query with default parameters
  const basicAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date().toISOString(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  TestValidator.predicate(
    "basic analytics has pagination",
    basicAnalytics.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page",
    basicAnalytics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit",
    basicAnalytics.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records",
    basicAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages",
    basicAnalytics.pagination.pages >= 0,
  );
  // Test 2: Advanced filtering with date ranges and minimum contributions
  const advancedAnalytics =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          registration_date_end: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_start: new Date(
            Date.now() - 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_end: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          min_comments: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(advancedAnalytics);
  TestValidator.predicate(
    "advanced analytics data array",
    Array.isArray(advancedAnalytics.data),
  );
  // Test 3: Sorting by article count
  const sortedByArticles =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "article_count" as const,
          sort_order: "desc" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<15>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortedByArticles);
  TestValidator.predicate(
    "sorted by articles has data",
    Array.isArray(sortedByArticles.data),
  );
  // Test 4: Sorting by comment count
  const sortedByComments =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "comment_count" as const,
          sort_order: "asc" as const,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<15>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortedByComments);
  TestValidator.predicate(
    "sorted by comments has data",
    Array.isArray(sortedByComments.data),
  );
  // Test 5: Empty filters with pagination
  const emptyFilters =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<25>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(emptyFilters);
  TestValidator.predicate(
    "empty filters pagination valid",
    emptyFilters.pagination.pages >= 0,
  );
  // Test 6: Combined filters scenario
  const combinedScenario =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          registration_date_start: new Date(
            Date.now() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          last_activity_end: new Date().toISOString(),
          min_articles: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          min_comments: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
          >(),
          sort_by: "last_activity" as const,
          sort_order: "desc" as const,
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<30>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(combinedScenario);
  TestValidator.predicate(
    "combined scenario data valid",
    Array.isArray(combinedScenario.data),
  );
}
