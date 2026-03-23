import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can retrieve a paginated list of all timesheet snapshots.
 * Verifies pagination metadata, snapshot structure, ordering, and empty state handling.
 */
export async function test_api_timesheet_snapshot_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Retrieve paginated list of timesheet snapshots (page 1, limit 10)
  const page1 =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1.pagination.pages >= 0,
  );
  // 4. Validate snapshot business logic for each item
  await ArrayUtil.asyncForEach(page1.data, async (snapshot) => {
    typia.assert(snapshot);
    // Validate employee structure exists
    typia.assert(snapshot.employee);
    typia.assert(snapshot.employee.member);
    typia.assert(snapshot.employee.role);
    // Business logic validation: total_hours should be non-negative
    TestValidator.predicate(
      "total_hours is non-negative",
      snapshot.total_hours >= 0,
    );
    // Business logic validation: status should be one of valid values
    const validStatuses = [
      "draft",
      "submitted",
      "approved",
      "rejected",
    ] as const;
    TestValidator.predicate(
      "status is valid",
      validStatuses.includes(snapshot.status as (typeof validStatuses)[number]),
    );
  });
  // 5. Test pagination with different parameters
  const page2 =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("current page is 1", page2.pagination.current, 1);
  TestValidator.equals("limit is 5", page2.pagination.limit, 5);
  TestValidator.predicate(
    "data count matches limit or less",
    page2.data.length <= 5,
  );
  // 6. Test empty state (filter by non-existent employee)
  const emptyResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          employee_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty state has 0 records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty state has 0 pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty state has empty data array",
    emptyResult.data.length,
    0,
  );
  // 7. Validate ordering (newest first by created_at) if we have multiple snapshots
  if (page1.data.length > 1) {
    let isOrderedDescending = true;
    for (let i = 1; i < page1.data.length; i++) {
      const prevDate = new Date(page1.data[i - 1].created_at).getTime();
      const currDate = new Date(page1.data[i].created_at).getTime();
      if (prevDate < currDate) {
        isOrderedDescending = false;
        break;
      }
    }
    TestValidator.predicate(
      "snapshots ordered by created_at descending",
      isOrderedDescending,
    );
  }
}
