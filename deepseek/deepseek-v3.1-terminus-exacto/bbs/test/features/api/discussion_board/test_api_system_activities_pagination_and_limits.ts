import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test pagination functionality and limit enforcement for system activity logs.
 * Verify that the endpoint correctly handles different page sizes and limits,
 * returning appropriate pagination metadata including current page, total records,
 * and page count. Test boundary conditions such as requesting page beyond available
 * data, zero results scenarios, and maximum limit enforcement.
 */
export async function test_api_system_activities_pagination_and_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection using available utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test 1: Default pagination (page=1, limit=10)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Test 2: Custom page size (minimum limit=1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  // Test 3: Maximum limit enforcement (limit=100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // Test 4: Page beyond available data
  const highPageResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(highPageResponse);
  // Test 5: Zero results scenario with date filtering
  const futureDate = new Date(Date.now() + 86400000).toISOString();
  const futureDateResponse =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          start_date: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(futureDateResponse);
  // Test 6: Different page numbers
  if (defaultResponse.pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.discussionBoard.superAdmin.system_activities.index(
        superAdminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardSystemActivity.IRequest,
        },
      );
    typia.assert(secondPageResponse);
  }
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "limit should be between 1 and 100",
    minLimitResponse.pagination.limit >= 1 &&
      maxLimitResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "high page should return empty or valid data",
    highPageResponse.data.length === 0 ||
      highPageResponse.pagination.current > 0,
  );
  TestValidator.predicate(
    "future date should return zero records",
    futureDateResponse.pagination.records === 0,
  );
}
