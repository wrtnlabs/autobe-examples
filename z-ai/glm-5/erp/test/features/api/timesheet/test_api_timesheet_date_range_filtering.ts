import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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

export async function test_api_timesheet_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Define date range for filtering (last 60 days to last 30 days)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Test basic date range filtering
  const timesheetPage = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(timesheetPage);
  // 4. Validate all returned timesheets are within date range
  for (const timesheet of timesheetPage.data) {
    const weekStartDate = new Date(timesheet.weekStartDate);
    TestValidator.predicate(
      "week_start_date should be >= from_date",
      weekStartDate.getTime() >= fromDate.getTime(),
    );
    TestValidator.predicate(
      "week_start_date should be <= to_date",
      weekStartDate.getTime() <= toDate.getTime(),
    );
  }
  // 5. Verify pagination metadata
  TestValidator.equals("page is 1", timesheetPage.pagination.current, 1);
  TestValidator.predicate(
    "limit is within valid range",
    timesheetPage.pagination.limit > 0 && timesheetPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    timesheetPage.pagination.records >= 0,
  );
  // 6. Test single week filter (from_date equals to_date)
  const singleWeekFrom = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
  const singleWeekTo = new Date(singleWeekFrom);
  const singleWeekResult = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        from_date: singleWeekFrom.toISOString(),
        to_date: singleWeekTo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(singleWeekResult);
  // Validate single week filter results
  for (const timesheet of singleWeekResult.data) {
    const weekStartDate = new Date(timesheet.weekStartDate);
    TestValidator.equals(
      "single week: week_start_date equals filter date",
      weekStartDate.getTime(),
      singleWeekFrom.getTime(),
    );
  }
  // 7. Test with status filter combined with date range
  const combinedFilterResult =
    await api.functional.erpHrm.member.timesheets.index(memberConnection, {
      body: {
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
        status: "draft",
        page: 1,
        limit: 10,
      } satisfies IErpHrmTimesheet.IRequest,
    });
  typia.assert(combinedFilterResult);
  // Validate combined filter results
  for (const timesheet of combinedFilterResult.data) {
    const weekStartDate = new Date(timesheet.weekStartDate);
    TestValidator.predicate(
      "combined filter: week_start_date within range",
      weekStartDate.getTime() >= fromDate.getTime() &&
        weekStartDate.getTime() <= toDate.getTime(),
    );
    TestValidator.equals(
      "combined filter: status is draft",
      timesheet.status,
      "draft",
    );
  }
  // 8. Test pagination with second page (if available)
  if (timesheetPage.pagination.pages > 1) {
    const page2Result = await api.functional.erpHrm.member.timesheets.index(
      memberConnection,
      {
        body: {
          from_date: fromDate.toISOString(),
          to_date: toDate.toISOString(),
          page: 2,
          limit: 10,
        } satisfies IErpHrmTimesheet.IRequest,
      },
    );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current is 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 has same total records as page 1",
      page2Result.pagination.records,
      timesheetPage.pagination.records,
    );
  }
}
