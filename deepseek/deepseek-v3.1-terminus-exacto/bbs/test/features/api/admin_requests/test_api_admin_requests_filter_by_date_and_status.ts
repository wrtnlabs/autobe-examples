import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_requests_filter_by_date_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate test dates for filtering
  const baseDate = new Date("2024-01-01T00:00:00Z");
  const date1 = new Date(
    baseDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // Jan 2
  const date2 = new Date(
    baseDate.getTime() + 48 * 60 * 60 * 1000,
  ).toISOString(); // Jan 3
  const date3 = new Date(
    baseDate.getTime() + 72 * 60 * 60 * 1000,
  ).toISOString(); // Jan 4
  // Note: In a real implementation, we would create actual admin requests here
  // using the appropriate API endpoints. However, based on the available
  // SDK functions, we can only test the filtering functionality with existing data.
  // Test 1: Filter by date range only
  const dateRangeFilter =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          created_after: date1,
          created_before: date3,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // Test 2: Filter by status only (rejected)
  const statusFilter =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(statusFilter);
  // Test 3: Combined date range and status filtering
  const combinedFilter =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          created_after: date1,
          created_before: date3,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Test 4: Empty result set (date range with no matches)
  const emptyFilter =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          created_after: new Date(
            baseDate.getTime() + 100 * 24 * 60 * 60 * 1000,
          ).toISOString(), // Far future date
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "empty result set records",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set pages",
    emptyFilter.pagination.pages,
    0,
  );
  // Test 5: Updated_at date range filtering
  const updatedFilter =
    await api.functional.discussionBoard.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          updated_after: date1,
          updated_before: date3,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(updatedFilter);
}
