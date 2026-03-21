import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_filter_by_date_range_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Helper to get Monday of a week
  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  // Helper to get Sunday of a week
  const getSunday = (monday: Date): Date => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
  };
  // Create timesheets across multiple weeks (current week, last week, 2 weeks ago)
  const now = new Date();
  const weeks = [
    {
      monday: getMonday(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)),
      label: "2 weeks ago",
    },
    {
      monday: getMonday(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)),
      label: "last week",
    },
    { monday: getMonday(now), label: "current week" },
  ];
  // Create draft timesheets
  const draftTimesheets = await ArrayUtil.asyncMap(weeks, async (week) => {
    const weekMonday = new Date(week.monday);
    const weekSunday = getSunday(weekMonday);
    const timesheet = await generate_random_erp_hrm_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekMonday.toISOString(),
          week_end_date: weekSunday.toISOString(),
        },
      },
    );
    typia.assert(timesheet);
    return { timesheet, weekMonday, label: week.label };
  });
  // Submit one timesheet to create submitted status
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: draftTimesheets[1].timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Approve one timesheet to create approved status
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(memberConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(approvedTimesheet);
  // Get all created timesheets for reference
  const allTimesheetsResponse =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: {},
    });
  typia.assert(allTimesheetsResponse);
  // Validation Point 1: weekStartDateFrom filter
  const fromDate = new Date(draftTimesheets[2].weekMonday);
  const fromResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDateFrom: fromDate.toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(fromResponse);
  TestValidator.predicate(
    "weekStartDateFrom returns timesheets starting from that date",
    fromResponse.data.every((ts) => new Date(ts.weekStartDate) >= fromDate),
  );
  // Validation Point 2: weekStartDateTo filter
  const toDate = new Date(draftTimesheets[0].weekMonday);
  const toResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDateTo: toDate.toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(toResponse);
  TestValidator.predicate(
    "weekStartDateTo returns timesheets up to and including that date",
    toResponse.data.every((ts) => new Date(ts.weekStartDate) <= toDate),
  );
  // Validation Point 3: Combined date range filters
  const rangeResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDateFrom:
          draftTimesheets[1].weekMonday.toISOString() as string &
            tags.Format<"date-time">,
        weekStartDateTo: draftTimesheets[1].weekMonday.toISOString() as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(rangeResponse);
  TestValidator.equals(
    "Combined date range returns exactly one timesheet (last week)",
    rangeResponse.data.length,
    1,
  );
  TestValidator.equals(
    "Combined date range returns the last week timesheet",
    rangeResponse.data[0]?.id,
    draftTimesheets[1].timesheet.id,
  );
  // Validation Point 4: status='draft' filter
  const draftResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "draft",
      },
    },
  );
  typia.assert(draftResponse);
  TestValidator.predicate(
    "status='draft' returns only draft timesheets",
    draftResponse.data.every((ts) => ts.status === "draft"),
  );
  // Validation Point 5: status='submitted' filter
  const submittedResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "submitted",
      },
    },
  );
  typia.assert(submittedResponse);
  TestValidator.predicate(
    "status='submitted' returns only submitted timesheets",
    submittedResponse.data.every((ts) => ts.status === "submitted"),
  );
  // Validation Point 6: status='approved' filter
  const approvedResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "approved",
      },
    },
  );
  typia.assert(approvedResponse);
  TestValidator.predicate(
    "status='approved' returns only approved timesheets",
    approvedResponse.data.every((ts) => ts.status === "approved"),
  );
  // Validation Point 7: status='rejected' filter
  const rejectedResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "rejected",
      },
    },
  );
  typia.assert(rejectedResponse);
  TestValidator.predicate(
    "status='rejected' returns only rejected timesheets (or empty)",
    rejectedResponse.data.every((ts) => ts.status === "rejected"),
  );
  // Validation Point 8: Empty result set
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const futureDateISO = futureDate.toISOString();
  const emptyResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        weekStartDateFrom: futureDateISO as string & tags.Format<"date-time">,
      },
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "Empty result returns empty data array",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "Empty result pagination shows zero records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "Empty result pagination shows zero pages",
    emptyResponse.pagination.pages,
    0,
  );
}
