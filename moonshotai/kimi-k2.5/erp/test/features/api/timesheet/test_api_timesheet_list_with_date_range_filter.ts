import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
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

export async function test_api_timesheet_list_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish member authentication and organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Step 2: Test timesheet listing with week start date range filter
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const weekStartRangeRequest = {
    weekStartDateFrom: oneYearAgo.toISOString(),
    weekStartDateTo: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IErpHrmTimesheet.IRequest;
  const weekStartRangeResponse =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: weekStartRangeRequest,
    });
  typia.assert(weekStartRangeResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    weekStartRangeResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    weekStartRangeResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    weekStartRangeResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    weekStartRangeResponse.pagination.pages >= 0,
  );
  // Validate that returned timesheets fall within the date range
  for (const timesheet of weekStartRangeResponse.data) {
    const timesheetWeekStart = new Date(timesheet.weekStartDate);
    TestValidator.predicate(
      `timesheet ${timesheet.id} weekStartDate is within range`,
      timesheetWeekStart >= oneYearAgo && timesheetWeekStart <= now,
    );
  }
  // Step 3: Test timesheet listing with week end date range filter
  const weekEndRangeRequest = {
    weekEndDateFrom: oneMonthAgo.toISOString(),
    weekEndDateTo: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IErpHrmTimesheet.IRequest;
  const weekEndRangeResponse =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: weekEndRangeRequest,
    });
  typia.assert(weekEndRangeResponse);
  // Validate timesheet data structure - typia.assert already validates types
  for (const timesheet of weekEndRangeResponse.data) {
    typia.assert(timesheet);
    // Verify week end date is within range (business logic validation)
    const timesheetWeekEnd = new Date(timesheet.weekEndDate);
    TestValidator.predicate(
      `timesheet ${timesheet.id} weekEndDate is within range`,
      timesheetWeekEnd >= oneMonthAgo && timesheetWeekEnd <= now,
    );
  }
  // Step 4: Test combined date range filters (payroll quarter scenario)
  const quarterStart = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1,
  );
  const quarterEnd = new Date(
    quarterStart.getFullYear(),
    quarterStart.getMonth() + 3,
    0,
  );
  const quarterFilterRequest = {
    weekStartDateFrom: quarterStart.toISOString(),
    weekEndDateTo: quarterEnd.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IErpHrmTimesheet.IRequest;
  const quarterResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    { body: quarterFilterRequest },
  );
  typia.assert(quarterResponse);
  // Validate pagination with larger limit
  TestValidator.equals(
    "quarter filter limit matches request",
    quarterResponse.pagination.limit,
    50,
  );
  // Step 5: Test pagination parameters
  const paginationRequest = {
    weekStartDateFrom: oneYearAgo.toISOString(),
    weekStartDateTo: now.toISOString(),
    page: 1,
    limit: 5,
  } satisfies IErpHrmTimesheet.IRequest;
  const paginationResponse =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: paginationRequest,
    });
  typia.assert(paginationResponse);
  // Validate pagination constraints
  TestValidator.predicate(
    "data length respects limit",
    paginationResponse.data.length <= 5,
  );
  TestValidator.equals(
    "pagination limit equals request",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current equals request",
    paginationResponse.pagination.current,
    1,
  );
  // Step 6: Test with status filter combined with date range
  const statusDateFilterRequest = {
    status: "approved",
    weekStartDateFrom: oneYearAgo.toISOString(),
    weekStartDateTo: now.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IErpHrmTimesheet.IRequest;
  const statusDateResponse =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: statusDateFilterRequest,
    });
  typia.assert(statusDateResponse);
  // Validate filtered results have correct status
  for (const timesheet of statusDateResponse.data) {
    TestValidator.equals(
      "timesheet status matches filter",
      timesheet.status,
      "approved",
    );
  }
  // Step 7: Verify empty date range handling (future dates likely return no results)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyRangeRequest = {
    weekStartDateFrom: futureDate.toISOString(),
    weekStartDateTo: new Date(
      futureDate.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    page: 1,
    limit: 20,
  } satisfies IErpHrmTimesheet.IRequest;
  const emptyResponse = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    { body: emptyRangeRequest },
  );
  typia.assert(emptyResponse);
  // Validate empty results handling
  TestValidator.equals(
    "empty filter returns zero records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter returns zero pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty filter returns empty data array",
    emptyResponse.data.length,
    0,
  );
}
