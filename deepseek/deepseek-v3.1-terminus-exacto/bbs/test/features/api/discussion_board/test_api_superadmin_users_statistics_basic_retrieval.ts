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
 * Test the basic functionality of retrieving user statistics without any filters.
 * This scenario validates that super administrators can access comprehensive user
 * engagement data including article counts, comment counts, and activity timestamps.
 * The test should verify that the response includes pagination metadata and
 * statistical summaries for all users in the system.
 */
export async function test_api_superadmin_users_statistics_basic_retrieval(
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
  // Call user statistics endpoint with valid pagination parameters
  const statistics =
    await api.functional.discussionBoard.superAdmin.users.statistics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(statistics);
  // Validate business logic - pagination should be consistent
  TestValidator.predicate(
    "pagination current page is valid",
    statistics.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    statistics.pagination.limit >= 1 && statistics.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records is non-negative",
    statistics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages calculation is correct",
    statistics.pagination.pages ===
      Math.ceil(statistics.pagination.records / statistics.pagination.limit),
  );
  // Validate data array contains valid statistics
  TestValidator.predicate(
    "data array length matches pagination limit",
    statistics.data.length <= statistics.pagination.limit,
  );
}
