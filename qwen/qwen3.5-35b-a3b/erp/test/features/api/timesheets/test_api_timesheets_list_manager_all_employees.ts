import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheets_list_manager_all_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Register second member (manager role in their organization)
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 3. Manager requests all timesheets in their organization (no employee_id filter)
  // Manager should be able to see all timesheets from employees in their organization
  const allTimesheets =
    await api.functional.hrmPlatform.member.timesheets.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(allTimesheets);
  // 4. Validate response structure and pagination
  TestValidator.equals(
    "response has pagination",
    allTimesheets.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allTimesheets.pagination.limit >= 1 &&
      allTimesheets.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allTimesheets.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches records and limit",
    allTimesheets.pagination.pages ===
      Math.ceil(
        allTimesheets.pagination.records / allTimesheets.pagination.limit,
      ),
  );
  // 5. Validate timesheet data structure for each entry
  for (const timesheet of allTimesheets.data) {
    typia.assert(timesheet);
    // Validate required fields exist
    TestValidator.predicate(
      "timesheet has valid UUID",
      /^[0-9a-f-]{36}$/i.test(timesheet.id),
    );
    TestValidator.predicate(
      "timesheet has start date",
      timesheet.start_date !== undefined,
    );
    TestValidator.predicate(
      "timesheet has end date",
      timesheet.end_date !== undefined,
    );
    TestValidator.predicate(
      "timesheet has valid status",
      ["pending", "submitted", "approved", "rejected", "cancelled"].includes(
        timesheet.status,
      ),
    );
    TestValidator.predicate(
      "timesheet has valid total hours",
      timesheet.total_hours === null ||
        (typeof timesheet.total_hours === "number" &&
          timesheet.total_hours >= 0),
    );
    TestValidator.predicate(
      "timesheet has employee reference",
      timesheet.employee !== undefined,
    );
    typia.assert(timesheet.employee);
    TestValidator.predicate(
      "employee has valid ID",
      timesheet.employee.id !== undefined,
    );
    TestValidator.predicate(
      "employee has valid email",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(timesheet.employee.email),
    );
    TestValidator.predicate(
      "employee has valid name",
      timesheet.employee.display_name !== undefined,
    );
  }
  // 6. Test status filter - request only submitted timesheets
  const submittedFilter =
    await api.functional.hrmPlatform.member.timesheets.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: ["submitted"],
        },
      },
    );
  typia.assert(submittedFilter);
  // Validate that all returned timesheets have submitted status
  for (const timesheet of submittedFilter.data) {
    typia.assert(timesheet);
    TestValidator.equals(
      "timesheet has submitted status",
      timesheet.status,
      "submitted",
    );
  }
  // 7. Test multiple status filter
  const multiStatusFilter =
    await api.functional.hrmPlatform.member.timesheets.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          status: ["pending", "submitted", "approved"],
        },
      },
    );
  typia.assert(multiStatusFilter);
  // Validate that all returned timesheets have one of the requested statuses
  for (const timesheet of multiStatusFilter.data) {
    typia.assert(timesheet);
    TestValidator.predicate(
      "timesheet has one of requested statuses",
      ["pending", "submitted", "approved"].includes(timesheet.status),
    );
  }
  // 8. Validate pagination aggregation - multiple statuses should return subset of all
  TestValidator.predicate(
    "multi-status filter returns subset of all timesheets",
    multiStatusFilter.data.length <= allTimesheets.data.length,
  );
  // 9. Test date range filter
  const dateRangeFilter =
    await api.functional.hrmPlatform.member.timesheets.index(
      managerConnection,
      {
        body: {
          page: 1,
          limit: 100,
          startDate: new Date("2024-01-01").toISOString(),
          endDate: new Date("2024-12-31").toISOString(),
        },
      },
    );
  typia.assert(dateRangeFilter);
  // Validate date range filtering
  for (const timesheet of dateRangeFilter.data) {
    typia.assert(timesheet);
    const startDate = new Date(timesheet.start_date);
    const endDate = new Date(timesheet.end_date);
    const filterStart = new Date(dateRangeFilter.data[0].start_date);
    const filterEnd = new Date(dateRangeFilter.data[0].end_date);
    TestValidator.predicate(
      "timesheet start_date is within range",
      startDate >= new Date("2024-01-01") &&
        startDate <= new Date("2024-12-31"),
    );
    TestValidator.predicate(
      "timesheet end_date is within range",
      endDate >= new Date("2024-01-01") && endDate <= new Date("2024-12-31"),
    );
  }
  // 10. Test sorting by start_date descending
  const sortedByDate = await api.functional.hrmPlatform.member.timesheets.index(
    managerConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "start_date",
        order: "desc",
      },
    },
  );
  typia.assert(sortedByDate);
  // Validate sorting
  for (let i = 1; i < sortedByDate.data.length; i++) {
    const prevDate = new Date(sortedByDate.data[i - 1].start_date);
    const currDate = new Date(sortedByDate.data[i].start_date);
    TestValidator.predicate(
      "timesheets are sorted by start_date descending",
      currDate <= prevDate,
    );
  }
}
