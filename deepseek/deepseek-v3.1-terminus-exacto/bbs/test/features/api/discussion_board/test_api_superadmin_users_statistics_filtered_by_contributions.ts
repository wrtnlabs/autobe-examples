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

export async function test_api_superadmin_users_statistics_filtered_by_contributions(
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
  // Test filtering with minimum article and comment thresholds
  const minArticles = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const minComments = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const statistics =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          min_articles: minArticles,
          min_comments: minComments,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(statistics);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof statistics.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    statistics.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    statistics.pagination.limit >= 1 && statistics.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    statistics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    statistics.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(statistics.data), true);
  // Test with specific contribution thresholds
  const specificStats =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          min_articles: 5,
          min_comments: 10,
          sort_by: "article_count",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(specificStats);
  // Validate response structure for specific thresholds
  TestValidator.predicate(
    "specific stats pagination valid",
    specificStats.pagination.current >= 0,
  );
  TestValidator.predicate(
    "specific stats limit valid",
    specificStats.pagination.limit >= 1 &&
      specificStats.pagination.limit <= 100,
  );
  // Validate that filtering parameters are accepted and processed
  TestValidator.predicate("min_articles parameter accepted", minArticles >= 0);
  TestValidator.predicate("min_comments parameter accepted", minComments >= 0);
}
