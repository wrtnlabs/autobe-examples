import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
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
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test timesheet list filtering by status and date range.
 *
 * Validates the timesheet filtering functionality by creating multiple timesheets in different workflow states across various week periods, then verifying that the filtering endpoint correctly returns only matching records.
 *
 * The test covers:
 * 1. Creating timesheets in draft, submitted, approved, and rejected states
 * 2. Testing status-based filtering to ensure only matching statuses are returned
 * 3. Testing date range filtering to ensure only timesheets within the specified week period are returned
 * 4. Testing combined status and date range filters
 * 5. Testing pagination parameters (page and limit)
 *
 * 1. Authenticate as member and create organization context.
 * 2. Create multiple timesheets with different statuses across different weeks.
 * 3. Test filtering by status (draft, submitted, approved, rejected).
 * 4. Test filtering by date range (week_start_date_gte and week_start_date_lte).
 * 5. Test combined filters (status + date range).
 * 6. Test pagination with page and limit parameters.
 */
export async function test_api_timesheet_list_filtered_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Generate organization ID for testing
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate employee ID for timesheet creation
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create timesheets in different states across different weeks
  const baseDate = new Date("2024-01-01T00:00:00Z");
  // Week 1: Monday 2024-01-01
  const week1Start = new Date(baseDate);
  week1Start.setDate(baseDate.getDate());
  // Week 2: Monday 2024-01-08
  const week2Start = new Date(baseDate);
  week2Start.setDate(baseDate.getDate() + 7);
  // Week 3: Monday 2024-01-15
  const week3Start = new Date(baseDate);
  week3Start.setDate(baseDate.getDate() + 14);
  // Week 4: Monday 2024-01-22
  const week4Start = new Date(baseDate);
  week4Start.setDate(baseDate.getDate() + 21);
  // Create timesheets with different statuses
  const draftTimesheet1 =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: week1Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(draftTimesheet1);
  const submittedTimesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: week2Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(submittedTimesheet);
  const approvedTimesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: week3Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(approvedTimesheet);
  const rejectedTimesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: week4Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(rejectedTimesheet);
  // 3. Test filtering by status - draft
  const draftFilterResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          status: "draft",
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(draftFilterResult);
  TestValidator.predicate(
    "draft filter returns only draft timesheets",
    draftFilterResult.data.every((ts) => ts.status === "draft"),
  );
  TestValidator.equals("draft filter count", draftFilterResult.data.length, 1);
  // 4. Test filtering by status - submitted
  const submittedFilterResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          status: "submitted",
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(submittedFilterResult);
  TestValidator.predicate(
    "submitted filter returns only submitted timesheets",
    submittedFilterResult.data.every((ts) => ts.status === "submitted"),
  );
  TestValidator.equals(
    "submitted filter count",
    submittedFilterResult.data.length,
    1,
  );
  // 5. Test filtering by status - approved
  const approvedFilterResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          status: "approved",
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.predicate(
    "approved filter returns only approved timesheets",
    approvedFilterResult.data.every((ts) => ts.status === "approved"),
  );
  TestValidator.equals(
    "approved filter count",
    approvedFilterResult.data.length,
    1,
  );
  // 6. Test filtering by status - rejected
  const rejectedFilterResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          status: "rejected",
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(rejectedFilterResult);
  TestValidator.predicate(
    "rejected filter returns only rejected timesheets",
    rejectedFilterResult.data.every((ts) => ts.status === "rejected"),
  );
  TestValidator.equals(
    "rejected filter count",
    rejectedFilterResult.data.length,
    1,
  );
  // 7. Test filtering by date range - week 1 and week 2
  const dateRangeResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          week_start_date_gte: week1Start.toISOString(),
          week_start_date_lte: week2Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns timesheets within range",
    dateRangeResult.data.length,
    2,
  );
  TestValidator.predicate(
    "date range filter - all within range",
    dateRangeResult.data.every(
      (ts) =>
        ts.week_start_date >= week1Start.toISOString() &&
        ts.week_start_date <= week2Start.toISOString(),
    ),
  );
  // 8. Test combined filter - status + date range
  const combinedFilterResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          status: "draft",
          week_start_date_gte: week1Start.toISOString(),
          week_start_date_lte: week3Start.toISOString(),
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filter returns matching status within date range",
    combinedFilterResult.data.length,
    1,
  );
  TestValidator.predicate(
    "combined filter - correct status",
    combinedFilterResult.data.length > 0 &&
      combinedFilterResult.data[0].status === "draft",
  );
  // 9. Test pagination - page 1, limit 2
  const paginationResult =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit respected",
    paginationResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit value",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination total records >= returned",
    paginationResult.pagination.records >= paginationResult.data.length,
  );
  // 10. Test pagination - page 2, limit 2
  const paginationPage2Result =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          page: 2,
          limit: 2,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(paginationPage2Result);
  TestValidator.equals(
    "pagination page 2 current",
    paginationPage2Result.pagination.current,
    2,
  );
  TestValidator.predicate(
    "pagination page 2 has remaining records",
    paginationPage2Result.data.length <= 2,
  );
}
