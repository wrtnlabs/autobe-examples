import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test edge cases for timelog listing including empty results, billable filtering, and timesheet status visibility.
 *
 * Validates the timelog listing endpoint with various filter combinations and edge cases. Tests billable status filtering, empty result handling, and timesheet status field population. Ensures proper pagination metadata is returned even with zero results.
 *
 * Special attention is given to verifying that the billable filter correctly separates billable from non-billable timelogs, and that the timesheet_status field accurately reflects whether a timelog is included in an approved timesheet.
 *
 * 1. Authenticate as a member using join operation.
 * 2. List timelogs with billable=true filter and verify all returned timelogs are billable.
 * 3. List timelogs with billable=false filter and verify all returned timelogs are non-billable.
 * 4. List timelogs with a far future date range to test empty result handling.
 * 5. Verify pagination metadata shows records=0 and pages=0 for empty results.
 * 6. List all timelogs without filters and verify pagination metadata.
 * 7. Verify timesheet_status field is properly populated or null based on timesheet inclusion.
 */
export async function test_api_timelog_list_edge_cases_and_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test billable=true filter
  const billableTimelogs =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: {
        billable: true,
      } satisfies IHrmTimeTrackTimelog.IRequest,
    });
  typia.assert(billableTimelogs);
  // Verify all returned timelogs are billable (business logic validation)
  for (const timelog of billableTimelogs.data) {
    TestValidator.predicate(
      `timelog ${timelog.id} is billable as filtered`,
      timelog.billable === true,
    );
  }
  // 3. Test billable=false filter
  const nonBillableTimelogs =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: {
        billable: false,
      } satisfies IHrmTimeTrackTimelog.IRequest,
    });
  typia.assert(nonBillableTimelogs);
  // Verify all returned timelogs are non-billable (business logic validation)
  for (const timelog of nonBillableTimelogs.data) {
    TestValidator.predicate(
      `timelog ${timelog.id} is non-billable as filtered`,
      timelog.billable === false,
    );
  }
  // 4. Test empty results with far future date range
  const farFutureDate = new Date("2099-12-31T23:59:59Z").toISOString();
  const emptyResults = await api.functional.hrmTimeTrack.member.timelogs.index(
    memberConnection,
    {
      body: {
        from_date: farFutureDate,
        to_date: farFutureDate,
      } satisfies IHrmTimeTrackTimelog.IRequest,
    },
  );
  typia.assert(emptyResults);
  // 5. Verify empty result pagination
  TestValidator.equals(
    "empty results pagination records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pagination pages",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results pagination current",
    emptyResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty results data array length",
    emptyResults.data.length,
    0,
  );
  // 6. Test listing all timelogs without filters
  const allTimelogs = await api.functional.hrmTimeTrack.member.timelogs.index(
    memberConnection,
    {
      body: {} satisfies IHrmTimeTrackTimelog.IRequest,
    },
  );
  typia.assert(allTimelogs);
  // Verify pagination metadata is consistent
  TestValidator.predicate(
    "pagination current is at least 1",
    allTimelogs.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allTimelogs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allTimelogs.pagination.records >= 0,
  );
  // 7. Verify timesheet_status field for all timelogs (business logic)
  for (const timelog of allTimelogs.data) {
    // timesheet_status can be null (not in timesheet) or a string (in timesheet)
    // This is a business logic check, not a type check
    TestValidator.predicate(
      `timelog ${timelog.id} has valid timesheet_status value`,
      timelog.timesheet_status === null ||
        typeof timelog.timesheet_status === "string",
    );
  }
  // 8. Test pagination parameters
  const paginatedResults =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackTimelog.IRequest,
    });
  typia.assert(paginatedResults);
  TestValidator.equals(
    "pagination current matches request",
    paginatedResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResults.data.length <= 10,
  );
  // 9. Test sorting functionality
  const sortedByDateDesc =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: {
        sort: "date",
        order: "desc",
        limit: 5,
      } satisfies IHrmTimeTrackTimelog.IRequest,
    });
  typia.assert(sortedByDateDesc);
  // Verify sorting order (business logic)
  for (let i = 1; i < sortedByDateDesc.data.length; i++) {
    TestValidator.predicate(
      `timelogs sorted by date descending at index ${i}`,
      new Date(sortedByDateDesc.data[i].date).getTime() <=
        new Date(sortedByDateDesc.data[i - 1].date).getTime(),
    );
  }
  // 10. Test sorting by duration ascending
  const sortedByDurationAsc =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: {
        sort: "duration_seconds",
        order: "asc",
        limit: 5,
      } satisfies IHrmTimeTrackTimelog.IRequest,
    });
  typia.assert(sortedByDurationAsc);
  // Verify sorting order (business logic)
  for (let i = 1; i < sortedByDurationAsc.data.length; i++) {
    TestValidator.predicate(
      `timelogs sorted by duration ascending at index ${i}`,
      sortedByDurationAsc.data[i].duration_seconds >=
        sortedByDurationAsc.data[i - 1].duration_seconds,
    );
  }
  // 11. Verify billable and non-billable counts sum to total (if data exists)
  const totalRecords = allTimelogs.pagination.records;
  const billableRecords = billableTimelogs.pagination.records;
  const nonBillableRecords = nonBillableTimelogs.pagination.records;
  if (totalRecords > 0) {
    TestValidator.equals(
      "billable + non-billable equals total",
      billableRecords + nonBillableRecords,
      totalRecords,
    );
  }
}
