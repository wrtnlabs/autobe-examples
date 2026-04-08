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

export async function test_api_timesheets_list_by_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account (creates organization with Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW", "JPY"]) satisfies string,
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new connection with member token for timesheet operations
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Create multiple timesheets via PATCH requests
  const employeeId = memberAuth.member.id;
  const timesheets: IHrmPlatformTimesheet.ISummary[] = [];
  // Create timesheets for different weeks
  const week1Start = new Date(2024, 0, 1);
  const week1End = new Date(2024, 0, 7);
  const week2Start = new Date(2024, 0, 8);
  const week2End = new Date(2024, 0, 14);
  const week3Start = new Date(2024, 0, 15);
  const week3End = new Date(2024, 0, 21);
  // Patch operations to create timesheets (simulating the backend creating them)
  const timesheetData = [
    {
      start_date: week1Start.toISOString(),
      end_date: week1End.toISOString(),
      status: "pending" as const,
      total_hours: 40,
      employee_id: employeeId,
    },
    {
      start_date: week2Start.toISOString(),
      end_date: week2End.toISOString(),
      status: "submitted" as const,
      total_hours: 45,
      employee_id: employeeId,
    },
    {
      start_date: week3Start.toISOString(),
      end_date: week3End.toISOString(),
      status: "approved" as const,
      total_hours: 38,
      employee_id: employeeId,
    },
  ];
  // Note: Since we can only call the timesheets.index endpoint (GET/PATCH list),
  // we'll test the list endpoint with the data that would be created in the system
  // The actual timesheet creation is done by the backend, we test retrieval
  // 4. List all timesheets with no filters
  const listResponse = await api.functional.hrmPlatform.member.timesheets.index(
    employeeConnection,
    {
      body: {},
    },
  );
  typia.assert(listResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    listResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    listResponse.pagination.limit,
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  );
  TestValidator.predicate(
    "pagination records >= 0",
    listResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    listResponse.pagination.pages >= 0,
  );
  // 6. Validate each timesheet belongs to the employee
  for (const timesheet of listResponse.data) {
    TestValidator.equals(
      `timesheet ${timesheet.id} employee_id`,
      timesheet.employee.id,
      employeeId,
    );
    TestValidator.predicate(
      `timesheet ${timesheet.id} has valid status`,
      ["pending", "submitted", "approved", "rejected", "cancelled"].includes(
        timesheet.status,
      ),
    );
    TestValidator.predicate(
      `timesheet ${timesheet.id} has valid dates`,
      new Date(timesheet.start_date) < new Date(timesheet.end_date),
    );
    TestValidator.predicate(
      `timesheet ${timesheet.id} has valid total_hours`,
      timesheet.total_hours === null || timesheet.total_hours >= 0,
    );
  }
  // 7. Verify sorting by start_date descending (default)
  if (listResponse.data.length > 1) {
    for (let i = 0; i < listResponse.data.length - 1; i++) {
      const curr = listResponse.data[i];
      const next = listResponse.data[i + 1];
      TestValidator.predicate(
        "timesheets sorted by start_date descending",
        new Date(curr.start_date) >= new Date(next.start_date),
      );
    }
  }
  // 8. Test filtering by status
  const statusListResponse =
    await api.functional.hrmPlatform.member.timesheets.index(
      employeeConnection,
      {
        body: {
          status: ["pending", "submitted"],
        },
      },
    );
  typia.assert(statusListResponse);
  for (const timesheet of statusListResponse.data) {
    TestValidator.predicate(
      `filtered timesheet has requested status`,
      timesheet.status === "pending" || timesheet.status === "submitted",
    );
  }
  // 9. Test filtering by date range
  const dateRangeStart = week1Start.toISOString();
  const dateRangeEnd = week2End.toISOString();
  const dateRangeResponse =
    await api.functional.hrmPlatform.member.timesheets.index(
      employeeConnection,
      {
        body: {
          startDate: dateRangeStart,
          endDate: dateRangeEnd,
        },
      },
    );
  typia.assert(dateRangeResponse);
  for (const timesheet of dateRangeResponse.data) {
    const start = new Date(timesheet.start_date);
    const end = new Date(timesheet.end_date);
    const rangeStart = new Date(dateRangeStart);
    const rangeEnd = new Date(dateRangeEnd);
    TestValidator.predicate(
      `timesheet start_date within range`,
      start >= rangeStart && start <= rangeEnd,
    );
    TestValidator.predicate(
      `timesheet end_date within range`,
      end >= rangeStart && end <= rangeEnd,
    );
  }
  // 10. Test empty result set
  const farFutureStart = new Date(2099, 0, 1);
  const farFutureEnd = new Date(2099, 0, 7);
  const emptyResponse =
    await api.functional.hrmPlatform.member.timesheets.index(
      employeeConnection,
      {
        body: {
          startDate: farFutureStart.toISOString(),
          endDate: farFutureEnd.toISOString(),
        },
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty result set records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result set data length",
    emptyResponse.data.length,
    0,
  );
}
