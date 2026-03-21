import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_create_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (join creates organization and employee automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Add the authenticated employee to the project as a member
  // Note: The employee is created automatically during join for the organization
  // The join process creates both member and employee records
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: member.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 4. Create timelog entries within the target week (Monday to Sunday)
  // Calculate Monday of the current week as week_start_date
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // Create 3 timelog entries within the week
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate,
        duration: 120, // 2 hours
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: tuesday.toISOString(),
        duration: 180, // 3 hours
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: wednesday.toISOString(),
        duration: 240, // 4 hours
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // Calculate expected total hours
  const expectedTotalHours = (120 + 180 + 240) / 60; // 9 hours
  // 5. Create timesheet with the week_start_date
  const timesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 6. Verify the timesheet properties
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "total_hours matches expected",
    timesheet.total_hours,
    expectedTotalHours,
  );
  TestValidator.predicate(
    "week_start_date is Monday",
    timesheet.week_start_date.startsWith(monday.toISOString().substring(0, 10)),
  );
  // Verify week_end_date is Sunday (+6 days from Monday)
  const expectedSunday = new Date(monday);
  expectedSunday.setDate(monday.getDate() + 6);
  TestValidator.predicate(
    "week_end_date is Sunday",
    timesheet.week_end_date.startsWith(
      expectedSunday.toISOString().substring(0, 10),
    ),
  );
  // Verify reviewer and timestamps are null
  TestValidator.equals("reviewer is null", timesheet.reviewer, null);
  TestValidator.equals("submitted_at is null", timesheet.submitted_at, null);
  TestValidator.equals("reviewed_at is null", timesheet.reviewed_at, null);
  TestValidator.equals(
    "rejection_reason is null",
    timesheet.rejection_reason,
    null,
  );
  // 7. Verify all created timelogs are included
  TestValidator.predicate(
    "timelogs array has 3 entries",
    timesheet.timelogs.length === 3,
  );
  const timelogIds = timesheet.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "timelog1 is included",
    timelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 is included",
    timelogIds.includes(timelog2.id),
  );
  TestValidator.predicate(
    "timelog3 is included",
    timelogIds.includes(timelog3.id),
  );
  // 8. Verify employee information matches
  TestValidator.equals(
    "employee member id matches",
    timesheet.employee.member.id,
    member.id,
  );
}
