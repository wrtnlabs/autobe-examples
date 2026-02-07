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

export async function test_api_performance_metrics_recent_system_health(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test basic performance metrics retrieval with pagination
  const performanceMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "last_activity",
          sort_order: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(performanceMetrics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof performanceMetrics.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    performanceMetrics.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit reasonable",
    performanceMetrics.pagination.limit > 0 &&
      performanceMetrics.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    performanceMetrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    performanceMetrics.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals(
    "data is array",
    Array.isArray(performanceMetrics.data),
    true,
  );
  // Test different sorting options
  const sortedByArticles =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "article_count",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortedByArticles);
  const sortedByComments =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          sort_by: "comment_count",
          sort_order: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(sortedByComments);
  // Test filtering by minimum contributions
  const activeUsersMetrics =
    await api.functional.discussionBoard.superAdmin.performance_metrics.index(
      superAdminConnection,
      {
        body: {
          min_articles: 1,
          min_comments: 1,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(activeUsersMetrics);
}
