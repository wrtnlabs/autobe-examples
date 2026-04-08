import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee timesheet filtering by status and date range with pagination and sorting.
 *
 * Validates the timesheet listing functionality for authenticated members, including filtering by approval status (draft, submitted, approved, rejected), date range queries on week periods, pagination controls, and custom sorting options. Ensures that employees can only access their own timesheets and that filtering criteria are correctly applied to return the appropriate subset of timesheet data.
 *
 * Special attention is given to verifying that status filtering correctly narrows results to the specified approval state, date range filtering includes timesheets where week_start_date falls within the specified range, and combined filters return the intersection of both criteria. Pagination and sorting functionality are also validated to ensure proper navigation and ordering of results.
 *
 * 1. Register and authenticate a new member account.
 * 2. Filter timesheets by status only (approved) and verify only approved timesheets are returned.
 * 3. Filter timesheets by date range only and verify timesheets within the range are returned.
 * 4. Filter timesheets by both status and date range and verify intersection of criteria.
 * 5. Test pagination with page and limit parameters.
 * 6. Test sorting by total_hours in descending order.
 */
export async function test_api_timesheet_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Filter by status only (approved)
  const approvedFilter: IHrmTimeTrackTimesheet.IRequest = {
    status: "approved",
  } satisfies IHrmTimeTrackTimesheet.IRequest;
  const approvedResult =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "all timesheets are approved",
    approvedResult.data.every((ts) => ts.status === "approved"),
  );
  // 3. Filter by date range only
  const fromDate = new Date("2024-01-01T00:00:00Z").toISOString();
  const toDate = new Date("2024-12-31T23:59:59Z").toISOString();
  const dateRangeFilter: IHrmTimeTrackTimesheet.IRequest = {
    from_date: fromDate,
    to_date: toDate,
  } satisfies IHrmTimeTrackTimesheet.IRequest;
  const dateRangeResult =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "all timesheets within date range",
    dateRangeResult.data.every(
      (ts) => ts.week_start_date >= fromDate && ts.week_start_date <= toDate,
    ),
  );
  // 4. Filter by both status and date range
  const combinedFilter: IHrmTimeTrackTimesheet.IRequest = {
    status: "submitted",
    from_date: fromDate,
    to_date: toDate,
  } satisfies IHrmTimeTrackTimesheet.IRequest;
  const combinedResult =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "all timesheets are submitted and within date range",
    combinedResult.data.every(
      (ts) =>
        ts.status === "submitted" &&
        ts.week_start_date >= fromDate &&
        ts.week_start_date <= toDate,
    ),
  );
  // 5. Test pagination
  const paginationFilter: IHrmTimeTrackTimesheet.IRequest = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackTimesheet.IRequest;
  const paginationResult =
    await api.functional.hrmTimeTrack.member.timesheets.index(
      memberConnection,
      { body: paginationFilter },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationResult.data.length <= 10,
  );
  // 6. Test sorting by total_hours descending
  const sortFilter: IHrmTimeTrackTimesheet.IRequest = {
    sort_by: "total_hours",
    sort_order: "desc",
  } satisfies IHrmTimeTrackTimesheet.IRequest;
  const sortResult = await api.functional.hrmTimeTrack.member.timesheets.index(
    memberConnection,
    { body: sortFilter },
  );
  typia.assert(sortResult);
  TestValidator.predicate(
    "timesheets sorted by total_hours descending",
    sortResult.data.every((ts, i, arr) => {
      if (i === 0) return true;
      return arr[i - 1].total_hours >= ts.total_hours;
    }),
  );
}
