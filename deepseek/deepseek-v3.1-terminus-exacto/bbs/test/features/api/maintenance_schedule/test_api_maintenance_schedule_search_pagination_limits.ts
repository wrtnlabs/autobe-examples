import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMaintenanceSchedule";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_maintenance_schedule_search_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Test pagination with limit=1 (smallest valid limit)
  const pageLimit1 =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(pageLimit1);
  // 3. Test pagination with limit=10 (medium limit)
  const pageLimit10 =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(pageLimit10);
  // 4. Test pagination with limit=50 (large limit)
  const pageLimit50 =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(pageLimit50);
  // 5. Verify pagination metadata for each limit
  TestValidator.equals(
    "pagination metadata exists for limit=1",
    typeof pageLimit1.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination metadata exists for limit=10",
    typeof pageLimit10.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination metadata exists for limit=50",
    typeof pageLimit50.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid for limit=1",
    pageLimit1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "current page is valid for limit=10",
    pageLimit10.pagination.current >= 0,
  );
  TestValidator.predicate(
    "current page is valid for limit=50",
    pageLimit50.pagination.current >= 0,
  );
  TestValidator.equals(
    "limit matches requested value for limit=1",
    pageLimit1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "limit matches requested value for limit=10",
    pageLimit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "limit matches requested value for limit=50",
    pageLimit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "total records is valid for limit=1",
    pageLimit1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total records is valid for limit=10",
    pageLimit10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total records is valid for limit=50",
    pageLimit50.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is valid for limit=1",
    pageLimit1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total pages is valid for limit=10",
    pageLimit10.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total pages is valid for limit=50",
    pageLimit50.pagination.pages >= 0,
  );
  // 6. Validate data array size matches requested limit for non-final pages
  if (pageLimit1.pagination.current < pageLimit1.pagination.pages) {
    TestValidator.equals(
      "data size matches limit=1 for non-final page",
      pageLimit1.data.length,
      1,
    );
  }
  if (pageLimit10.pagination.current < pageLimit10.pagination.pages) {
    TestValidator.equals(
      "data size matches limit=10 for non-final page",
      pageLimit10.data.length,
      10,
    );
  }
  if (pageLimit50.pagination.current < pageLimit50.pagination.pages) {
    TestValidator.equals(
      "data size matches limit=50 for non-final page",
      pageLimit50.data.length,
      50,
    );
  }
  // 7. Test edge case: page exceeding total pages
  const exceededPage =
    await api.functional.discussionBoard.superAdmin.maintenance_schedules.index(
      superAdminConnection,
      {
        body: {
          page:
            Math.max(
              pageLimit1.pagination.pages,
              pageLimit10.pagination.pages,
              pageLimit50.pagination.pages,
            ) + 1,
          limit: 10,
        } satisfies IDiscussionBoardMaintenanceSchedule.IRequest,
      },
    );
  typia.assert(exceededPage);
  // Validate empty data for page beyond total pages
  TestValidator.equals(
    "empty data for page beyond total pages",
    exceededPage.data.length,
    0,
  );
  // 8. Additional validation: Verify pagination calculations
  if (pageLimit1.pagination.records > 0 && pageLimit1.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      pageLimit1.pagination.records / pageLimit1.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation is correct",
      pageLimit1.pagination.pages,
      expectedPages,
    );
  }
}
