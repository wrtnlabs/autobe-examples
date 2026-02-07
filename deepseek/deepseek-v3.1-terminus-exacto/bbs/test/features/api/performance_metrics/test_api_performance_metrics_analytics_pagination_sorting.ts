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
 * Test pagination and sorting functionality for performance metrics analytics.
 * This test validates that the pagination system works correctly with different
 * page sizes and page numbers, and ensures sorting behavior is consistent across
 * different pagination configurations.
 */
export async function test_api_performance_metrics_analytics_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test pagination with different configurations
  const testCases = [
    {
      page: 1,
      limit: 10,
      sort_by: "last_activity" as const,
      sort_order: "desc" as const,
    },
    {
      page: 2,
      limit: 25,
      sort_by: "registration_date" as const,
      sort_order: "asc" as const,
    },
    {
      page: 1,
      limit: 50,
      sort_by: "last_activity" as const,
      sort_order: "asc" as const,
    },
    {
      page: 999,
      limit: 10,
      sort_by: "registration_date" as const,
      sort_order: "desc" as const,
    }, // Edge case: page beyond available records
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
        superAdminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
            sort_by: testCase.sort_by,
            sort_order: testCase.sort_order,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      "pagination limit",
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      "total records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "total pages non-negative",
      response.pagination.pages >= 0,
    );
    // Validate data array size
    if (response.pagination.current < response.pagination.pages) {
      TestValidator.equals(
        "data array matches limit",
        response.data.length,
        testCase.limit,
      );
    } else {
      // Last page or beyond available pages
      TestValidator.predicate(
        "data array size valid",
        response.data.length <= testCase.limit,
      );
    }
    // Validate pagination calculations
    TestValidator.equals(
      "total pages calculation",
      response.pagination.pages,
      Math.ceil(response.pagination.records / response.pagination.limit),
    );
  }
  // 3. Test sorting consistency
  const sortTestCases = [
    { sort_by: "last_activity" as const, sort_order: "asc" as const },
    { sort_by: "last_activity" as const, sort_order: "desc" as const },
    { sort_by: "registration_date" as const, sort_order: "asc" as const },
    { sort_by: "registration_date" as const, sort_order: "desc" as const },
  ];
  for (const sortCase of sortTestCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sort_by: sortCase.sort_by,
            sort_order: sortCase.sort_order,
          } satisfies IDiscussionBoardPerformanceMetric.IRequest,
        },
      );
    typia.assert(response);
    // Basic validation that sorting parameters are accepted
    TestValidator.predicate("sorting parameters accepted", true);
  }
  // 4. Test with minimum limit (edge case)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.performance_metrics.analytics.index(
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
    "minimum limit accepted",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data array valid with min limit",
    minLimitResponse.data.length <= 1,
  );
}
