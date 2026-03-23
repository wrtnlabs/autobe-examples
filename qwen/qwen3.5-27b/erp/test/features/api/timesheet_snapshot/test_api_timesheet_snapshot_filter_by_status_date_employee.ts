import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_snapshot_filter_by_status_date_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        href: "https://hrm.example.com/signup",
        referrer: "https://google.com",
        ip: "192.168.1.100",
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create test timesheets with different statuses and weeks
  // We'll create timesheets for 3 different weeks
  const week1Start: string = new Date(2026, 2, 1, 0, 0, 0, 0).toISOString(); // Monday March 1, 2026
  const week2Start: string = new Date(2026, 2, 8, 0, 0, 0, 0).toISOString(); // Monday March 8, 2026
  const week3Start: string = new Date(2026, 2, 15, 0, 0, 0, 0).toISOString(); // Monday March 15, 2026
  // Create timesheet for week 1
  const timesheet1: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week1Start,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet1);
  // Create timesheet for week 2
  const timesheet2: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week2Start,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet2);
  // Create timesheet for week 3
  const timesheet3: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week3Start,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet3);
  // Validate timesheets were created
  TestValidator.predicate(
    "timesheet1 created successfully",
    () => timesheet1.id !== undefined,
  );
  TestValidator.predicate(
    "timesheet2 created successfully",
    () => timesheet2.id !== undefined,
  );
  TestValidator.predicate(
    "timesheet3 created successfully",
    () => timesheet3.id !== undefined,
  );
  // 3. Test filtering by status
  const statusFilterResult: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {
          status: "draft",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "status filter returns snapshots",
    () => statusFilterResult.data.length > 0,
  );
  TestValidator.predicate("all snapshots match status", () =>
    statusFilterResult.data.every((snapshot) => snapshot.status === "draft"),
  );
  // 4. Test filtering by week_start_date range
  const dateRangeResult: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {
          week_start_date_from: week1Start,
          week_start_date_to: week2Start,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate("date range filter works", () =>
    dateRangeResult.data.every(
      (snapshot) =>
        snapshot.week_start_date >= week1Start &&
        snapshot.week_start_date <= week2Start,
    ),
  );
  // 5. Test filtering by employee_id
  const employeeFilterResult: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {
          employee_id: memberAuth.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(employeeFilterResult);
  TestValidator.predicate(
    "employee filter returns snapshots",
    () => employeeFilterResult.data.length > 0,
  );
  TestValidator.predicate("all snapshots belong to filtered employee", () =>
    employeeFilterResult.data.every(
      (snapshot) => snapshot.employee.id === memberAuth.id,
    ),
  );
  // 6. Test combined filters (status + date range)
  const combinedFilterResult: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {
          status: "draft",
          week_start_date_from: week1Start,
          week_start_date_to: week3Start,
          employee_id: memberAuth.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate("combined filters apply all conditions", () =>
    combinedFilterResult.data.every(
      (snapshot) =>
        snapshot.status === "draft" &&
        snapshot.week_start_date >= week1Start &&
        snapshot.week_start_date <= week3Start &&
        snapshot.employee.id === memberAuth.id,
    ),
  );
  // 7. Test pagination with filters
  const paginationResult: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {
          status: "draft",
          page: 1,
          limit: 5,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    () => paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculation is correct",
    () =>
      paginationResult.pagination.pages ===
      Math.ceil(
        paginationResult.pagination.records / paginationResult.pagination.limit,
      ),
  );
  // 8. Test filtering by approver_id (null for draft timesheets)
  const approverFilterResult: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.member.timesheet_snapshots.index(
      memberConnection,
      {
        body: {
          approver_id: null,
          status: "draft",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(approverFilterResult);
  TestValidator.predicate("approver filter for null works", () =>
    approverFilterResult.data.every((snapshot) => snapshot.approver === null),
  );
}
