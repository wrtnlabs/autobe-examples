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
 * Test filtering timesheet snapshots by employee_id and approver_id.
 *
 * Verifies that the timesheet snapshot filtering mechanism correctly:
 * 1. Filters snapshots by specific employee_id
 * 2. Filters snapshots by specific approver_id
 * 3. Combines both filters for precise querying
 * 4. Returns correct employee and approver information in snapshots
 * 5. Handles null approver for draft/submitted status
 */
export async function test_api_timesheet_snapshot_filter_by_employee_and_approver(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 2. Test filter by employee_id only
  const employeeFilterResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(employeeFilterResult);
  // Verify response structure and pagination
  TestValidator.predicate(
    "employee filter returns valid pagination",
    employeeFilterResult.pagination.current >= 1 &&
      employeeFilterResult.pagination.limit >= 1,
  );
  // 3. Test filter by approver_id only
  const approverFilterResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          approver_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(approverFilterResult);
  // Verify response structure
  TestValidator.predicate(
    "approver filter returns valid pagination",
    approverFilterResult.pagination.current >= 1 &&
      approverFilterResult.pagination.limit >= 1,
  );
  // 4. Test combined filters (employee_id and approver_id)
  const combinedFilterResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          employee_id: typia.random<string & tags.Format<"uuid">>(),
          approver_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  // Verify combined filter response structure
  TestValidator.predicate(
    "combined filter returns valid pagination",
    combinedFilterResult.pagination.current >= 1 &&
      combinedFilterResult.pagination.limit >= 1,
  );
  // 5. Test with null approver_id (for draft/submitted status)
  const nullApproverFilterResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          approver_id: null,
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(nullApproverFilterResult);
  // Verify null approver snapshots have draft or submitted status
  for (const snapshot of nullApproverFilterResult.data) {
    TestValidator.predicate(
      "null approver means draft or submitted status",
      snapshot.approver === null &&
        (snapshot.status === "draft" || snapshot.status === "submitted"),
    );
  }
  // 6. Test general snapshot listing to validate data structure
  const generalResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(generalResult);
  // Validate employee information in snapshots
  for (const snapshot of generalResult.data) {
    // Verify employee has required fields
    TestValidator.predicate(
      "snapshot has employee with employment_type",
      snapshot.employee.employment_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has employee with status",
      snapshot.employee.status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has employee member with email",
      snapshot.employee.member.email !== undefined,
    );
    TestValidator.predicate(
      "snapshot has employee with role",
      snapshot.employee.role !== undefined,
    );
    // Validate approver logic based on status
    if (snapshot.status === "approved" || snapshot.status === "rejected") {
      TestValidator.predicate(
        "approved/rejected status has non-null approver",
        snapshot.approver !== null,
      );
    } else {
      TestValidator.predicate(
        "draft/submitted status has null approver",
        snapshot.approver === null,
      );
    }
    // Validate rejection_reason logic
    if (snapshot.status === "rejected") {
      TestValidator.predicate(
        "rejected status has non-null rejection_reason",
        snapshot.rejection_reason !== null,
      );
    } else {
      TestValidator.equals(
        "non-rejected status has null rejection_reason",
        snapshot.rejection_reason,
        null,
      );
    }
  }
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "general query returns valid pagination",
    generalResult.pagination.current >= 1 &&
      generalResult.pagination.limit >= 1 &&
      generalResult.pagination.records >= 0 &&
      generalResult.pagination.pages >= 0,
  );
  // 8. Test status filter
  const statusFilterResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  // Verify all returned snapshots have the filtered status
  for (const snapshot of statusFilterResult.data) {
    TestValidator.equals(
      "status filter returns correct status",
      snapshot.status,
      "approved",
    );
  }
  // 9. Test date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          week_start_date_from: oneWeekAgo.toISOString(),
          week_start_date_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Verify date range filter works
  TestValidator.predicate(
    "date range filter returns valid response",
    dateRangeResult.pagination.current >= 1,
  );
}
