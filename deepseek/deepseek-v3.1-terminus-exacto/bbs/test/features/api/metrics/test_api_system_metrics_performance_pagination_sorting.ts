import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPerformanceMetric";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_system_metrics_performance_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using SDK since no utility function exists for login
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate super admin using SDK (no utility function available for login)
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Test 1: Default pagination (page 1, limit 20, default sort)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.pagination.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should be non-negative",
    defaultResponse.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    defaultResponse.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test 2: Pagination with ascending timestamp sort
  const ascResponse =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "asc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(ascResponse);
  TestValidator.equals(
    "asc page should be 1",
    ascResponse.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "asc limit should be 5",
    ascResponse.pagination.pagination.pagination.pagination.limit,
    5,
  );
  // Test 3: Pagination with descending timestamp sort
  const descResponse =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 3,
          sort: "desc",
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(descResponse);
  TestValidator.equals(
    "desc page should be 2",
    descResponse.pagination.pagination.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "desc limit should be 3",
    descResponse.pagination.pagination.pagination.pagination.limit,
    3,
  );
  // Test 4: Edge case - minimum limit value
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit should be 1",
    minLimitResponse.pagination.pagination.pagination.pagination.limit,
    1,
  );
  // Test 5: Edge case - maximum limit value
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.system.metrics.performance.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit should be 100",
    maxLimitResponse.pagination.pagination.pagination.pagination.limit,
    100,
  );
  // Test 6: Verify pagination consistency
  if (descResponse.pagination.pagination.pagination.pagination.records > 0) {
    TestValidator.predicate(
      "current page should be within total pages",
      descResponse.pagination.pagination.pagination.pagination.current <=
        descResponse.pagination.pagination.pagination.pagination.pages,
    );
    TestValidator.predicate(
      "records per page should not exceed limit",
      descResponse.data.length <=
        descResponse.pagination.pagination.pagination.pagination.limit,
    );
  }
  // Test 7: Sort validation for data ordering (if data exists)
  if (ascResponse.data.length > 1) {
    for (let i = 1; i < ascResponse.data.length; i++) {
      const prevTimestamp = new Date(
        ascResponse.data[i - 1].collection_timestamp,
      );
      const currTimestamp = new Date(ascResponse.data[i].collection_timestamp);
      TestValidator.predicate(
        `ascending sort: timestamp ${i - 1} should be <= timestamp ${i}`,
        prevTimestamp <= currTimestamp,
      );
    }
  }
}
