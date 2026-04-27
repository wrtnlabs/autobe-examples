import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_list_employee_filtered_by_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Create a member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_member_join(memberConnection, {
    body: { email, password },
  });
  typia.assert(joined);
  // 2. Create an organization (auto-creates employee record for the owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get the updated employee record
  const loginBody = { email, password } satisfies {
    email: string & tags.Format<"email">;
    password: string;
  };
  const authorized = await authorize_member_login(memberConnection, {
    body: loginBody as IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(authorized);
  const employee = authorized.employees[0]!;
  typia.assert(employee);
  // 4. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Add the employee as a project member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employee.id,
          role: "member" as const,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // ---- Compute current work week (Monday to Sunday) ----
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday
    .toISOString()
    .split("T")[0] satisfies string as string & tags.Format<"date">;
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  // 6. Create timelogs for the current work week
  const duration1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >() satisfies number as number;
  const timelog1 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: monday.toISOString(),
          project_id: project.id,
          duration_minutes: duration1,
        },
      },
    );
  typia.assert(timelog1);
  const duration2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<120>
  >() satisfies number as number;
  const timelog2 =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          date: tuesday.toISOString(),
          project_id: project.id,
          duration_minutes: duration2,
        },
      },
    );
  typia.assert(timelog2);
  // 7. Create a draft timesheet for the current week
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // ---- Execute the PATCH endpoint with draft status filter ----
  const page = await api.functional.hrmTimeTracking.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: "draft",
      } satisfies IHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page);
  // ---- Validation ----
  // All returned timesheets should have status = 'draft'
  for (const ts of page.data) {
    TestValidator.equals(
      "all returned timesheets are draft",
      ts.status,
      "draft",
    );
  }
  // The created timesheet should be in the results
  const found = page.data.find((ts) => ts.id === timesheet.id);
  TestValidator.predicate(
    "created timesheet appears in results",
    () => found !== undefined,
  );
  TestValidator.equals(
    "week_start_date matches",
    found!.week_start_date,
    timesheet.weekStartDate,
  );
  TestValidator.equals(
    "week_end_date matches",
    found!.week_end_date,
    timesheet.weekEndDate,
  );
  TestValidator.equals(
    "total_hours matches",
    found!.total_hours,
    timesheet.totalHours,
  );
  // Pagination metadata should be present with records >= 1
  TestValidator.predicate(
    "pagination records >= 1",
    () => page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination current >= 0",
    () => page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    () => page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    () => page.pagination.pages >= 1,
  );
  // Employee summary should be present on the found timesheet
  TestValidator.predicate(
    "employee has id",
    () => found!.employee.id.length > 0,
  );
  TestValidator.predicate(
    "employee has member display_name",
    () => found!.employee.member.display_name.length > 0,
  );
  // Results are sorted by week_start_date descending
  for (let i = 1; i < page.data.length; i++) {
    const prev = new Date(page.data[i - 1]!.week_start_date).getTime();
    const curr = new Date(page.data[i]!.week_start_date).getTime();
    TestValidator.predicate(
      `data[${i}] week_start_date <= data[${i - 1}]`,
      () => prev >= curr,
    );
  }
}
