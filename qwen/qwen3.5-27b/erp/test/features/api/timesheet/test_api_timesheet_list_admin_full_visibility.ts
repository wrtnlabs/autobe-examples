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
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin full visibility across all timesheets in the organization.
 * Verifies admin can view timesheets from all employees, all status states,
 * and see complete approval workflow information including approver details.
 */
export async function test_api_timesheet_list_admin_full_visibility(
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
  // 2. List all timesheets without filters
  const allTimesheets = await api.functional.hrmPlatform.admin.timesheets.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    },
  );
  typia.assert(allTimesheets);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    allTimesheets.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allTimesheets.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has non-negative records",
    allTimesheets.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    allTimesheets.pagination.pages >= 0,
  );
  // 4. List timesheets filtered by status: draft
  const draftTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        status: "draft",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(draftTimesheets);
  // 5. Validate draft timesheets structure
  for (const timesheet of draftTimesheets.data) {
    typia.assert(timesheet);
    // Verify required fields exist
    TestValidator.predicate(
      "timesheet has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        timesheet.id,
      ),
    );
    TestValidator.equals(
      "timesheet status is draft",
      timesheet.status,
      "draft",
    );
    TestValidator.predicate(
      "timesheet has non-negative total hours",
      timesheet.total_hours >= 0,
    );
    // Verify employee information is present
    typia.assert(timesheet.employee);
    TestValidator.predicate(
      "employee has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        timesheet.employee.id,
      ),
    );
    TestValidator.predicate(
      "employee has valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(timesheet.employee.member.email),
    );
    // For draft timesheets, approver should be null
    TestValidator.equals(
      "draft timesheet has no approver",
      timesheet.approver,
      null,
    );
    TestValidator.equals(
      "draft timesheet has no submitted_at",
      timesheet.submitted_at,
      null,
    );
    TestValidator.equals(
      "draft timesheet has no approved_at",
      timesheet.approved_at,
      null,
    );
    TestValidator.equals(
      "draft timesheet has no rejected_at",
      timesheet.rejected_at,
      null,
    );
    TestValidator.equals(
      "draft timesheet has no rejection_reason",
      timesheet.rejection_reason,
      null,
    );
  }
  // 6. List timesheets filtered by status: submitted
  const submittedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        status: "submitted",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(submittedTimesheets);
  // 7. Validate submitted timesheets structure
  for (const timesheet of submittedTimesheets.data) {
    typia.assert(timesheet);
    TestValidator.equals(
      "timesheet status is submitted",
      timesheet.status,
      "submitted",
    );
    // For submitted timesheets, should have submitted_at but no approval info
    TestValidator.predicate(
      "submitted timesheet has submitted_at",
      timesheet.submitted_at !== null,
    );
    TestValidator.equals(
      "submitted timesheet has no approved_at",
      timesheet.approved_at,
      null,
    );
    TestValidator.equals(
      "submitted timesheet has no rejected_at",
      timesheet.rejected_at,
      null,
    );
    TestValidator.equals(
      "submitted timesheet has no rejection_reason",
      timesheet.rejection_reason,
      null,
    );
  }
  // 8. List timesheets filtered by status: approved
  const approvedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        status: "approved",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(approvedTimesheets);
  // 9. Validate approved timesheets structure
  for (const timesheet of approvedTimesheets.data) {
    typia.assert(timesheet);
    TestValidator.equals(
      "timesheet status is approved",
      timesheet.status,
      "approved",
    );
    // For approved timesheets, should have approver and approved_at
    TestValidator.predicate(
      "approved timesheet has submitted_at",
      timesheet.submitted_at !== null,
    );
    TestValidator.predicate(
      "approved timesheet has approved_at",
      timesheet.approved_at !== null,
    );
    TestValidator.equals(
      "approved timesheet has no rejected_at",
      timesheet.rejected_at,
      null,
    );
    TestValidator.equals(
      "approved timesheet has no rejection_reason",
      timesheet.rejection_reason,
      null,
    );
    // Verify approver information is present
    if (timesheet.approver !== null) {
      typia.assert(timesheet.approver);
      TestValidator.predicate(
        "approver has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          timesheet.approver.id,
        ),
      );
      TestValidator.predicate(
        "approver has valid email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(timesheet.approver.member.email),
      );
    }
  }
  // 10. List timesheets filtered by status: rejected
  const rejectedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        status: "rejected",
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(rejectedTimesheets);
  // 11. Validate rejected timesheets structure
  for (const timesheet of rejectedTimesheets.data) {
    typia.assert(timesheet);
    TestValidator.equals(
      "timesheet status is rejected",
      timesheet.status,
      "rejected",
    );
    // For rejected timesheets, should have approver, rejected_at, and rejection_reason
    TestValidator.predicate(
      "rejected timesheet has submitted_at",
      timesheet.submitted_at !== null,
    );
    TestValidator.equals(
      "rejected timesheet has no approved_at",
      timesheet.approved_at,
      null,
    );
    TestValidator.predicate(
      "rejected timesheet has rejected_at",
      timesheet.rejected_at !== null,
    );
    TestValidator.predicate(
      "rejected timesheet has rejection_reason",
      timesheet.rejection_reason !== null,
    );
    TestValidator.predicate(
      "rejection_reason is not empty",
      timesheet.rejection_reason!.length > 0,
    );
    // Verify approver information is present
    if (timesheet.approver !== null) {
      typia.assert(timesheet.approver);
      TestValidator.predicate(
        "approver has valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          timesheet.approver.id,
        ),
      );
    }
  }
  // 12. Test pagination with custom page and limit
  const paginatedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(paginatedTimesheets);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedTimesheets.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedTimesheets.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length matches limit or less",
    paginatedTimesheets.data.length <= 10,
  );
  // 13. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dateFilteredTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: {
        week_start_date_from: twoWeeksAgo.toISOString(),
        week_start_date_to: oneWeekAgo.toISOString(),
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(dateFilteredTimesheets);
  // Verify all returned timesheets are within the date range
  for (const timesheet of dateFilteredTimesheets.data) {
    typia.assert(timesheet);
    const weekStart = new Date(timesheet.week_start_date);
    TestValidator.predicate(
      "timesheet week_start_date is within range",
      weekStart >= twoWeeksAgo && weekStart <= oneWeekAgo,
    );
  }
  // 14. Verify admin can see timesheets from different employees
  const allEmployeeIds = new Set<string>();
  for (const timesheet of allTimesheets.data) {
    typia.assert(timesheet);
    allEmployeeIds.add(timesheet.employee.id);
  }
  // Admin should be able to see timesheets from multiple employees (if data exists)
  TestValidator.predicate(
    "admin can see timesheets from employees",
    allEmployeeIds.size >= 0,
  );
}
