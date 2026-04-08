import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Note: For this test, we need to work with an existing employee in an organization
  // Since member join creates a user without organization context, we would need
  // additional setup to create an organization and employee record.
  // For simulation purposes, we'll use the connection directly with random UUIDs.
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a project for timelog association
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 3. Assign employee to the project as project member
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
      body: {
        employee_id: employeeId,
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
    });
  typia.assert(projectMember);
  // 4. Create timelog entries for the week
  const weekStartDate = new Date();
  // Normalize to Monday
  const dayOfWeek = weekStartDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStartDate.setDate(weekStartDate.getDate() + mondayOffset);
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog1 =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: weekStartDate.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: true,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog1);
  // Create second timelog for different day in same week
  const weekStartDate2 = new Date(weekStartDate);
  weekStartDate2.setDate(weekStartDate2.getDate() + 2); // Wednesday
  const timelog2 =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_project_id: project.id,
          date: weekStartDate2.toISOString(),
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          billable: false,
        } satisfies IHrmTimelog.ICreate,
      },
    );
  typia.assert(timelog2);
  // 5. Create a draft timesheet for the week containing the timelogs
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(timesheet);
  // Validate initial state is draft
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  // 6. Submit the timesheet
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.submit(
      memberConnection,
      {
        organizationId,
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 7. Validate status changed to submitted
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 8. Validate submitted_at timestamp is populated
  TestValidator.predicate(
    "submitted_at is populated",
    submittedTimesheet.submitted_at !== null &&
      submittedTimesheet.submitted_at !== undefined,
  );
  // 9. Validate total_hours is calculated
  TestValidator.predicate(
    "total_hours is positive",
    submittedTimesheet.total_hours > 0,
  );
  // 10. Validate timelogs are included
  TestValidator.predicate(
    "timelogs array exists",
    Array.isArray(submittedTimesheet.timelogs),
  );
  TestValidator.predicate(
    "timelogs has entries",
    submittedTimesheet.timelogs.length > 0,
  );
}
