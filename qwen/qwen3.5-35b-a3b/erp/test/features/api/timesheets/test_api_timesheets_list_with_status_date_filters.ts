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

export async function test_api_timesheets_list_with_status_date_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a member to have valid authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.hrmPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Generate mock timesheets for testing (since no create endpoint exists)
  const statusOptions: IHrmPlatformTimesheet.ISummary["status"][] = [
    "pending",
    "submitted",
    "approved",
    "rejected",
    "cancelled",
  ];
  const mockTimesheets = Array.from({ length: 10 }, (_, weekIndex) => {
    const startDate = new Date(2024, 0, 1 + weekIndex * 7);
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      start_date: startDate.toISOString(),
      end_date: new Date(
        startDate.getTime() + 6 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: statusOptions[weekIndex % statusOptions.length],
      notes: RandomGenerator.paragraph({ sentences: 2 }),
      total_hours: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<80>
      >(),
      employee: typia.random<IHrmPlatformEmployee.ISummary>(),
      created_at: startDate.toISOString(),
      updated_at: startDate.toISOString(),
      deleted_at: null,
    } satisfies IHrmPlatformTimesheet.ISummary;
  });
  // 3. Test Status Filter: Filter by ['submitted', 'approved']
  const statusFilterResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: ["submitted", "approved"],
      },
    });
  typia.assert(statusFilterResponse);
  // Verify status filter returns only matching timesheets
  const expectedStatusResults = mockTimesheets.filter((ts) =>
    ["submitted", "approved"].includes(ts.status),
  );
  TestValidator.equals(
    "status filter returns correct count",
    statusFilterResponse.data.length,
    expectedStatusResults.length,
  );
  // Verify each returned timesheet has matching status
  for (const timesheet of statusFilterResponse.data) {
    TestValidator.predicate(
      "timesheet has submitted or approved status",
      ["submitted", "approved"].includes(timesheet.status),
    );
  }
  // 4. Test Date Range Filter: Filter by start_date between two dates
  const filterStartDate = new Date(2024, 0, 14);
  const filterEndDate = new Date(2024, 0, 49);
  const dateFilterResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        startDate: filterStartDate.toISOString(),
        endDate: filterEndDate.toISOString(),
      },
    });
  typia.assert(dateFilterResponse);
  const expectedDateResults = mockTimesheets.filter((ts) => {
    const tsStartDate = new Date(ts.start_date);
    return tsStartDate >= filterStartDate && tsStartDate <= filterEndDate;
  });
  TestValidator.equals(
    "date range filter returns correct count",
    dateFilterResponse.data.length,
    expectedDateResults.length,
  );
  // Verify each returned timesheet has start_date within range
  for (const timesheet of dateFilterResponse.data) {
    const tsStartDate = new Date(timesheet.start_date);
    TestValidator.predicate(
      "timesheet start_date is within range",
      tsStartDate >= filterStartDate && tsStartDate <= filterEndDate,
    );
  }
  // 5. Test Combined Filters: Status + Date Range
  const combinedFilterResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        status: ["submitted"],
        startDate: filterStartDate.toISOString(),
        endDate: filterEndDate.toISOString(),
      },
    });
  typia.assert(combinedFilterResponse);
  const expectedCombinedResults = mockTimesheets.filter((ts) => {
    const tsStartDate = new Date(ts.start_date);
    return (
      ts.status === "submitted" &&
      tsStartDate >= filterStartDate &&
      tsStartDate <= filterEndDate
    );
  });
  TestValidator.equals(
    "combined filters returns correct count",
    combinedFilterResponse.data.length,
    expectedCombinedResults.length,
  );
  // Verify each result satisfies BOTH criteria
  for (const timesheet of combinedFilterResponse.data) {
    TestValidator.equals(
      "timesheet has submitted status",
      timesheet.status,
      "submitted",
    );
    const tsStartDate = new Date(timesheet.start_date);
    TestValidator.predicate(
      "timesheet start_date is within date range",
      tsStartDate >= filterStartDate && tsStartDate <= filterEndDate,
    );
  }
  // 6. Test Sorting: Sort by status ascending
  const sortStatusAscResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        sort: "status",
        order: "asc",
      },
    });
  typia.assert(sortStatusAscResponse);
  // Verify results are sorted by status ascending
  let lastStatus: string | null = null;
  for (const timesheet of sortStatusAscResponse.data) {
    if (lastStatus !== null) {
      TestValidator.predicate(
        "timesheets are sorted by status ascending",
        timesheet.status >= lastStatus,
      );
    }
    lastStatus = timesheet.status;
  }
  // 7. Test Sorting: Sort by total_hours descending
  const sortHoursDescResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        sort: "total_hours",
        order: "desc",
      },
    });
  typia.assert(sortHoursDescResponse);
  // Verify results are sorted by total_hours descending
  let lastTotalHours: number | null = null;
  for (const timesheet of sortHoursDescResponse.data) {
    if (lastTotalHours !== null) {
      TestValidator.predicate(
        "timesheets are sorted by total_hours descending",
        (timesheet.total_hours ?? 0) <= (lastTotalHours ?? 0),
      );
    }
    lastTotalHours = timesheet.total_hours;
  }
  // 8. Test Default Pagination: When no page/limit specified, should default to page=1, limit=10
  const defaultPaginationResponse =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {},
    });
  typia.assert(defaultPaginationResponse);
  TestValidator.equals(
    "default page is 1",
    defaultPaginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 10",
    defaultPaginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultPaginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPaginationResponse.pagination.pages >= 0,
  );
  // Verify calculated pages matches records and limit
  const expectedPages =
    defaultPaginationResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          defaultPaginationResponse.pagination.records /
            defaultPaginationResponse.pagination.limit,
        );
  TestValidator.equals(
    "calculated pages is correct",
    defaultPaginationResponse.pagination.pages,
    expectedPages,
  );
}
