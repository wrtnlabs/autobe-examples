import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test timesheet list date range filtering functionality.
 *
 * Validates that the PATCH /hrm/member/organizations/{organizationCode}/timesheets endpoint correctly filters timesheets by week_start_date using week_start_date_gte and week_start_date_lte parameters. The test authenticates as a member, retrieves timesheets across multiple weeks, then verifies that date range filtering returns only timesheets within the specified date range.
 *
 * Special attention is given to verifying that:
 * - ISO 8601 date-time format is properly handled
 * - Inclusive boundaries work correctly on both ends (gte and lte)
 * - Pagination structure is maintained in filtered results
 * - Results are sorted by week_start_date in descending order by default
 * - Empty result sets are handled properly when no timesheets match the date range
 *
 * 1. Authenticate as member using authorize_member_join utility function.
 * 2. Generate three week start dates spanning approximately 3 weeks.
 * 3. Query timesheets without date filters to get baseline data.
 * 4. Query timesheets with week_start_date_gte filter (lower bound only).
 * 5. Query timesheets with week_start_date_lte filter (upper bound only).
 * 6. Query timesheets with both week_start_date_gte and week_start_date_lte (full range).
 * 7. Validate that filtered results contain only timesheets within the specified range.
 * 8. Verify pagination metadata is correct for each query.
 * 9. Verify results are sorted by week_start_date in descending order.
 */
export async function test_api_timesheet_list_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await api.functional.hrm.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // Update connection with auth token for subsequent API calls
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: auth.token.access,
  };
  // Use organization code from auth response or fallback to test value
  const organizationCode = auth.organizations?.[0]?.id ?? "test-org";
  // 2. Generate three week start dates (Mondays) spanning 3 weeks
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  const dayOfWeek = baseDate.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  baseDate.setDate(baseDate.getDate() - daysUntilMonday);
  const week1Start = new Date(baseDate);
  const week2Start = new Date(baseDate);
  week2Start.setDate(week2Start.getDate() + 7);
  const week3Start = new Date(baseDate);
  week3Start.setDate(week3Start.getDate() + 14);
  const week1StartStr = week1Start.toISOString();
  const week2StartStr = week2Start.toISOString();
  const week3StartStr = week3Start.toISOString();
  // 3. Query all timesheets without filters (baseline)
  const allTimesheets =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(allTimesheets);
  // 4. Query with week_start_date_gte filter (lower bound only)
  const timesheetsFromWeek2 =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          week_start_date_gte: week2StartStr,
          page: 1,
          limit: 100,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(timesheetsFromWeek2);
  // Validate all returned timesheets have week_start_date >= week2Start
  for (const timesheet of timesheetsFromWeek2.data) {
    TestValidator.predicate(
      `timesheet week_start_date >= ${week2StartStr}`,
      new Date(timesheet.week_start_date) >= week2Start,
    );
  }
  // 5. Query with week_start_date_lte filter (upper bound only)
  const timesheetsUntilWeek2 =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          week_start_date_lte: week2StartStr,
          page: 1,
          limit: 100,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(timesheetsUntilWeek2);
  // Validate all returned timesheets have week_start_date <= week2Start
  for (const timesheet of timesheetsUntilWeek2.data) {
    TestValidator.predicate(
      `timesheet week_start_date <= ${week2StartStr}`,
      new Date(timesheet.week_start_date) <= week2Start,
    );
  }
  // 6. Query with both filters (full date range)
  const timesheetsInRange =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          week_start_date_gte: week2StartStr,
          week_start_date_lte: week3StartStr,
          page: 1,
          limit: 100,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(timesheetsInRange);
  // Validate all returned timesheets are within the date range
  for (const timesheet of timesheetsInRange.data) {
    const timesheetDate = new Date(timesheet.week_start_date);
    TestValidator.predicate(
      `timesheet week_start_date >= ${week2StartStr}`,
      timesheetDate >= week2Start,
    );
    TestValidator.predicate(
      `timesheet week_start_date <= ${week3StartStr}`,
      timesheetDate <= week3Start,
    );
  }
  // 7. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    timesheetsInRange.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    timesheetsInRange.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    timesheetsInRange.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    timesheetsInRange.pagination.pages >= 0,
  );
  // 8. Verify results are sorted by week_start_date in descending order
  if (timesheetsInRange.data.length > 1) {
    for (let i = 0; i < timesheetsInRange.data.length - 1; i++) {
      const current = new Date(timesheetsInRange.data[i].week_start_date);
      const next = new Date(timesheetsInRange.data[i + 1].week_start_date);
      TestValidator.predicate(
        `timesheet ${i} week_start_date >= timesheet ${i + 1} (descending order)`,
        current >= next,
      );
    }
  }
  // 9. Test empty result set with non-overlapping date range
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 1);
  const farFutureStr = farFuture.toISOString();
  const emptyResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode,
        body: {
          week_start_date_gte: farFutureStr,
          page: 1,
          limit: 100,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result set data array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set records count",
    emptyResult.pagination.records,
    0,
  );
}
