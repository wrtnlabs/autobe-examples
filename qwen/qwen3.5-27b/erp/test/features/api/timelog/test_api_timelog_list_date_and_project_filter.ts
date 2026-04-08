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
 * Test filtering timelogs by date range and project to verify business logic for time tracking analysis.
 *
 * Validates the timelog listing endpoint with various filter combinations including date range filtering, project-based filtering, and combined filters. Tests pagination parameters, sorting options, and response structure validation.
 *
 * Special attention is given to verifying that filters are properly applied and that the response includes correct pagination metadata and timelog summaries with all required fields.
 *
 * 1. Authenticate as member using authorize_member_join utility.
 * 2. Call timelog list with date range filter (from_date, to_date) and validate response structure.
 * 3. Call with project_id filter to test project-based filtering.
 * 4. Call with combined date range and project_id filters.
 * 5. Test pagination parameters (page, limit) and validate pagination metadata.
 * 6. Test sorting parameters (sort, order) and verify sort order.
 * 7. Validate all responses have correct structure with typia.assert().
 * 8. Validate pagination metadata using TestValidator.
 */
export async function test_api_timelog_list_date_and_project_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Test date range filtering
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7); // 7 days ago
  const toDate = new Date();
  const dateRangeFilter = {
    from_date: fromDate.toISOString(),
    to_date: toDate.toISOString(),
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackTimelog.IRequest;
  const dateRangeResult =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: dateRangeFilter,
    });
  typia.assert(dateRangeResult);
  // Validate that returned timelogs are within the date range
  await ArrayUtil.asyncForEach(dateRangeResult.data, async (timelog) => {
    const timelogDate = new Date(timelog.date);
    TestValidator.predicate(
      `timelog date ${timelog.id} is >= from_date`,
      timelogDate >= fromDate,
    );
    TestValidator.predicate(
      `timelog date ${timelog.id} is <= to_date`,
      timelogDate <= toDate,
    );
  });
  // 3. Test project_id filtering (use a project_id from existing timelog if available)
  let projectIdFilter: IHrmTimeTrackTimelog.IRequest;
  if (dateRangeResult.data.length > 0) {
    const existingProjectId = dateRangeResult.data[0].project.id;
    projectIdFilter = {
      project_id: existingProjectId,
      page: 1,
      limit: 20,
    } satisfies IHrmTimeTrackTimelog.IRequest;
  } else {
    // If no timelogs exist, test with empty result
    projectIdFilter = {
      page: 1,
      limit: 20,
    } satisfies IHrmTimeTrackTimelog.IRequest;
  }
  const projectIdResult =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: projectIdFilter,
    });
  typia.assert(projectIdResult);
  // If we used a specific project_id, validate all results match that project
  if (projectIdFilter.project_id) {
    await ArrayUtil.asyncForEach(projectIdResult.data, async (timelog) => {
      TestValidator.equals(
        `timelog ${timelog.id} belongs to filtered project`,
        timelog.project.id,
        projectIdFilter.project_id!,
      );
    });
  }
  // 4. Test combined date range and project_id filters
  let combinedFilter: IHrmTimeTrackTimelog.IRequest;
  if (dateRangeResult.data.length > 0) {
    const existingProjectId = dateRangeResult.data[0].project.id;
    combinedFilter = {
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString(),
      project_id: existingProjectId,
      page: 1,
      limit: 20,
    } satisfies IHrmTimeTrackTimelog.IRequest;
  } else {
    combinedFilter = {
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString(),
      page: 1,
      limit: 20,
    } satisfies IHrmTimeTrackTimelog.IRequest;
  }
  const combinedResult =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: combinedFilter,
    });
  typia.assert(combinedResult);
  // Validate combined filter results
  await ArrayUtil.asyncForEach(combinedResult.data, async (timelog) => {
    const timelogDate = new Date(timelog.date);
    TestValidator.predicate(
      `timelog ${timelog.id} date is within range`,
      timelogDate >= fromDate && timelogDate <= toDate,
    );
    if (combinedFilter.project_id) {
      TestValidator.equals(
        `timelog ${timelog.id} belongs to filtered project`,
        timelog.project.id,
        combinedFilter.project_id!,
      );
    }
  });
  // 5. Test pagination parameters
  const paginationFilter = {
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackTimelog.IRequest;
  const paginationResult =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: paginationFilter,
    });
  typia.assert(paginationResult);
  // 6. Test sorting parameters
  const sortFilter = {
    sort: "date",
    order: "desc",
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackTimelog.IRequest;
  const sortResult = await api.functional.hrmTimeTrack.member.timelogs.index(
    memberConnection,
    {
      body: sortFilter,
    },
  );
  typia.assert(sortResult);
  // Validate sorting order (descending by date)
  if (sortResult.data.length > 1) {
    for (let i = 1; i < sortResult.data.length; i++) {
      const prevDate = new Date(sortResult.data[i - 1].date);
      const currDate = new Date(sortResult.data[i].date);
      TestValidator.predicate(
        `timelogs are sorted in descending order (index ${i - 1} vs ${i})`,
        prevDate >= currDate,
      );
    }
  }
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginationResult.pagination.pages >= 0,
  );
  // 8. Validate pages calculation
  const expectedPages = Math.ceil(
    paginationResult.pagination.records / paginationResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    paginationResult.pagination.pages,
    expectedPages,
  );
  // 9. Test ascending sort order
  const ascSortFilter = {
    sort: "date",
    order: "asc",
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackTimelog.IRequest;
  const ascSortResult = await api.functional.hrmTimeTrack.member.timelogs.index(
    memberConnection,
    {
      body: ascSortFilter,
    },
  );
  typia.assert(ascSortResult);
  // Validate ascending sorting order
  if (ascSortResult.data.length > 1) {
    for (let i = 1; i < ascSortResult.data.length; i++) {
      const prevDate = new Date(ascSortResult.data[i - 1].date);
      const currDate = new Date(ascSortResult.data[i].date);
      TestValidator.predicate(
        `timelogs are sorted in ascending order (index ${i - 1} vs ${i})`,
        prevDate <= currDate,
      );
    }
  }
  // 10. Test other filter combinations
  const billableFilter = {
    billable: true,
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackTimelog.IRequest;
  const billableResult =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: billableFilter,
    });
  typia.assert(billableResult);
  // Validate all returned timelogs are billable
  await ArrayUtil.asyncForEach(billableResult.data, async (timelog) => {
    TestValidator.equals(
      `timelog ${timelog.id} is billable`,
      timelog.billable,
      true,
    );
  });
  const nonBillableFilter = {
    billable: false,
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackTimelog.IRequest;
  const nonBillableResult =
    await api.functional.hrmTimeTrack.member.timelogs.index(memberConnection, {
      body: nonBillableFilter,
    });
  typia.assert(nonBillableResult);
  // Validate all returned timelogs are non-billable
  await ArrayUtil.asyncForEach(nonBillableResult.data, async (timelog) => {
    TestValidator.equals(
      `timelog ${timelog.id} is non-billable`,
      timelog.billable,
      false,
    );
  });
}
