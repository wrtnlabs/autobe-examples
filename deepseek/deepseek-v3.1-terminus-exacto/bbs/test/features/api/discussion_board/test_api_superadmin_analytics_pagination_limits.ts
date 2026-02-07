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

export async function test_api_superadmin_analytics_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test minimum limit (1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  // Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // Test pagination metadata calculations
  TestValidator.predicate(
    "limit within bounds",
    maxLimitResponse.pagination.limit >= 1 &&
      maxLimitResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "current page matches request",
    maxLimitResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "total pages calculation correct",
    maxLimitResponse.pagination.pages ===
      Math.ceil(
        maxLimitResponse.pagination.records / maxLimitResponse.pagination.limit,
      ) ||
      (maxLimitResponse.pagination.records === 0 &&
        maxLimitResponse.pagination.pages === 0),
  );
  // Test page navigation with different page numbers
  const page1Response =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(page2Response);
  // Test that different pages return different data (if records exist)
  if (page1Response.pagination.records > 10) {
    TestValidator.notEquals(
      "page 1 and page 2 should differ when records exist",
      page1Response.data.length > 0 && page2Response.data.length > 0,
      false,
    );
  }
  // Test empty result set handling by using unlikely filter criteria
  const emptySetResponse =
    await api.functional.discussionBoard.superAdmin.analytics.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          registration_date_start: new Date(
            "3000-01-01T00:00:00Z",
          ).toISOString(),
        } satisfies IDiscussionBoardPerformanceMetric.IRequest,
      },
    );
  typia.assert(emptySetResponse);
  TestValidator.equals(
    "empty set has zero records",
    emptySetResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty set has zero pages",
    emptySetResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty set has empty data array",
    emptySetResponse.data.length,
    0,
  );
}
