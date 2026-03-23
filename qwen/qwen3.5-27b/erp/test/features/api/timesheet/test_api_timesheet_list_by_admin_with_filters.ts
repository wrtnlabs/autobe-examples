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
 * Test that an authenticated admin can retrieve a paginated list of timesheets with various filters.
 * Verifies: status filtering, date range filtering, employee filtering, pagination, and response structure.
 */
export async function test_api_timesheet_list_by_admin_with_filters(
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
    },
  });
  // 2. Basic listing without filters - verify default behavior
  const basicList = await api.functional.hrmPlatform.admin.timesheets.index(
    adminConnection,
    {
      body: {} satisfies IHrmPlatformTimesheet.IRequest,
    },
  );
  typia.assert(basicList);
  TestValidator.predicate(
    "basic list has pagination info",
    basicList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "basic list has non-negative record count",
    basicList.pagination.records >= 0,
  );
  // 3. Test status filtering - draft
  const draftFilter = {
    status: "draft",
  } satisfies IHrmPlatformTimesheet.IRequest;
  const draftTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: draftFilter,
    });
  typia.assert(draftTimesheets);
  TestValidator.equals(
    "all returned timesheets have draft status",
    draftTimesheets.data.every((ts) => ts.status === "draft"),
    true,
  );
  // 4. Test status filtering - submitted
  const submittedFilter = {
    status: "submitted",
  } satisfies IHrmPlatformTimesheet.IRequest;
  const submittedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: submittedFilter,
    });
  typia.assert(submittedTimesheets);
  TestValidator.equals(
    "all returned timesheets have submitted status",
    submittedTimesheets.data.every((ts) => ts.status === "submitted"),
    true,
  );
  // 5. Test status filtering - approved
  const approvedFilter = {
    status: "approved",
  } satisfies IHrmPlatformTimesheet.IRequest;
  const approvedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: approvedFilter,
    });
  typia.assert(approvedTimesheets);
  TestValidator.equals(
    "all returned timesheets have approved status",
    approvedTimesheets.data.every((ts) => ts.status === "approved"),
    true,
  );
  // 6. Test status filtering - rejected
  const rejectedFilter = {
    status: "rejected",
  } satisfies IHrmPlatformTimesheet.IRequest;
  const rejectedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: rejectedFilter,
    });
  typia.assert(rejectedTimesheets);
  TestValidator.equals(
    "all returned timesheets have rejected status",
    rejectedTimesheets.data.every((ts) => ts.status === "rejected"),
    true,
  );
  // 7. Test date range filtering - week_start_date_from
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7); // 7 days ago
  const fromFilter = {
    week_start_date_from: fromDate.toISOString(),
  } satisfies IHrmPlatformTimesheet.IRequest;
  const fromTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: fromFilter,
    });
  typia.assert(fromTimesheets);
  TestValidator.predicate(
    "all timesheets are from or after the specified date",
    fromTimesheets.data.every(
      (ts) => new Date(ts.week_start_date) >= new Date(fromDate.toISOString()),
    ),
  );
  // 8. Test date range filtering - week_start_date_to
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 7); // 7 days in future
  const toFilter = {
    week_start_date_to: toDate.toISOString(),
  } satisfies IHrmPlatformTimesheet.IRequest;
  const toTimesheets = await api.functional.hrmPlatform.admin.timesheets.index(
    adminConnection,
    {
      body: toFilter,
    },
  );
  typia.assert(toTimesheets);
  TestValidator.predicate(
    "all timesheets are on or before the specified date",
    toTimesheets.data.every(
      (ts) => new Date(ts.week_start_date) <= new Date(toDate.toISOString()),
    ),
  );
  // 9. Test date range filtering - both from and to
  const rangeFilter = {
    week_start_date_from: fromDate.toISOString(),
    week_start_date_to: toDate.toISOString(),
  } satisfies IHrmPlatformTimesheet.IRequest;
  const rangeTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: rangeFilter,
    });
  typia.assert(rangeTimesheets);
  TestValidator.predicate(
    "all timesheets are within the specified date range",
    rangeTimesheets.data.every(
      (ts) =>
        new Date(ts.week_start_date) >= new Date(fromDate.toISOString()) &&
        new Date(ts.week_start_date) <= new Date(toDate.toISOString()),
    ),
  );
  // 10. Test pagination - page parameter
  const page2Filter = {
    page: 2,
    limit: 10,
  } satisfies IHrmPlatformTimesheet.IRequest;
  const page2Timesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: page2Filter,
    });
  typia.assert(page2Timesheets);
  TestValidator.equals(
    "pagination current page is 2",
    page2Timesheets.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    page2Timesheets.pagination.limit,
    10,
  );
  // 11. Test pagination - limit parameter
  const limitFilter = {
    page: 1,
    limit: 5,
  } satisfies IHrmPlatformTimesheet.IRequest;
  const limitTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: limitFilter,
    });
  typia.assert(limitTimesheets);
  TestValidator.equals(
    "pagination limit is 5",
    limitTimesheets.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array size does not exceed limit",
    limitTimesheets.data.length <= 5,
  );
  // 12. Test response structure - verify all required fields
  if (basicList.data.length > 0) {
    const sampleTimesheet = basicList.data[0];
    typia.assert(sampleTimesheet);
    // Verify required fields exist
    TestValidator.predicate(
      "timesheet has id",
      typeof sampleTimesheet.id === "string",
    );
    TestValidator.predicate(
      "timesheet has week_start_date",
      typeof sampleTimesheet.week_start_date === "string",
    );
    TestValidator.predicate(
      "timesheet has status",
      typeof sampleTimesheet.status === "string",
    );
    TestValidator.predicate(
      "timesheet has total_hours",
      typeof sampleTimesheet.total_hours === "number",
    );
    TestValidator.predicate(
      "timesheet has employee",
      sampleTimesheet.employee !== null,
    );
    TestValidator.predicate(
      "timesheet has created_at",
      typeof sampleTimesheet.created_at === "string",
    );
    TestValidator.predicate(
      "timesheet has updated_at",
      typeof sampleTimesheet.updated_at === "string",
    );
    // Verify employee structure
    TestValidator.predicate(
      "employee has id",
      typeof sampleTimesheet.employee.id === "string",
    );
    TestValidator.predicate(
      "employee has member",
      sampleTimesheet.employee.member !== null,
    );
    TestValidator.predicate(
      "employee has role",
      sampleTimesheet.employee.role !== null,
    );
    // Verify approver can be null
    TestValidator.predicate(
      "approver can be null or have id",
      sampleTimesheet.approver === null ||
        typeof sampleTimesheet.approver.id === "string",
    );
    // Verify timestamps can be null
    TestValidator.predicate(
      "submitted_at can be null or string",
      sampleTimesheet.submitted_at === null ||
        typeof sampleTimesheet.submitted_at === "string",
    );
    TestValidator.predicate(
      "approved_at can be null or string",
      sampleTimesheet.approved_at === null ||
        typeof sampleTimesheet.approved_at === "string",
    );
    TestValidator.predicate(
      "rejected_at can be null or string",
      sampleTimesheet.rejected_at === null ||
        typeof sampleTimesheet.rejected_at === "string",
    );
    TestValidator.predicate(
      "rejection_reason can be null or string",
      sampleTimesheet.rejection_reason === null ||
        typeof sampleTimesheet.rejection_reason === "string",
    );
  }
  // 13. Test empty result set - use a very specific filter that likely returns nothing
  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 100);
  const emptyFilter = {
    week_start_date_from: farFutureDate.toISOString(),
  } satisfies IHrmPlatformTimesheet.IRequest;
  const emptyTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: emptyFilter,
    });
  typia.assert(emptyTimesheets);
  TestValidator.equals(
    "empty result has empty data array",
    emptyTimesheets.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has records count 0",
    emptyTimesheets.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has pages 0",
    emptyTimesheets.pagination.pages,
    0,
  );
  // 14. Test combined filters - status + date range
  const combinedFilter = {
    status: "approved",
    week_start_date_from: fromDate.toISOString(),
    week_start_date_to: toDate.toISOString(),
  } satisfies IHrmPlatformTimesheet.IRequest;
  const combinedTimesheets =
    await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
      body: combinedFilter,
    });
  typia.assert(combinedTimesheets);
  TestValidator.equals(
    "combined filter returns only approved timesheets",
    combinedTimesheets.data.every((ts) => ts.status === "approved"),
    true,
  );
  TestValidator.predicate(
    "combined filter respects date range",
    combinedTimesheets.data.every(
      (ts) =>
        new Date(ts.week_start_date) >= new Date(fromDate.toISOString()) &&
        new Date(ts.week_start_date) <= new Date(toDate.toISOString()),
    ),
  );
  // 15. Test employee_id filtering
  if (basicList.data.length > 0) {
    const sampleEmployeeId = basicList.data[0].employee.id;
    const employeeFilter = {
      employee_id: sampleEmployeeId,
    } satisfies IHrmPlatformTimesheet.IRequest;
    const employeeTimesheets =
      await api.functional.hrmPlatform.admin.timesheets.index(adminConnection, {
        body: employeeFilter,
      });
    typia.assert(employeeTimesheets);
    TestValidator.equals(
      "all returned timesheets belong to the specified employee",
      employeeTimesheets.data.every(
        (ts) => ts.employee.id === sampleEmployeeId,
      ),
      true,
    );
  }
  // 16. Test default sorting - week_start_date descending
  if (basicList.data.length >= 2) {
    TestValidator.predicate(
      "results are sorted by week_start_date descending",
      basicList.data.every((ts, index, array) => {
        if (index === 0) return true;
        return (
          new Date(array[index - 1].week_start_date) >=
          new Date(ts.week_start_date)
        );
      }),
    );
  }
}
