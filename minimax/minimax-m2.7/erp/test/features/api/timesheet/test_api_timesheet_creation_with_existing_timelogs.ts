import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_creation_with_existing_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for project setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Member1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a project and assign member to it
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#4A90E2",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Get project id and employee id via type casting
  const projectId = (project as unknown as IEntity).id as string &
    tags.Format<"uuid">;
  const employeeId = (member as IErpHrmMember.IAuthorized).id as string &
    tags.Format<"uuid">;
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: projectId },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 4. Calculate target week dates (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : -dayOfWeek + 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  const formatDateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const weekStartDateStr = formatDateOnly(monday);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  // 5. Create timelogs for Monday, Wednesday, Friday of the target week
  const mondayTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: `${weekStartDateStr}T12:00:00.000Z`,
        durationMinutes: 240,
        billable: true,
        description: "Monday work session",
      },
    },
  );
  typia.assert(mondayTimelog);
  const wednesdayTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: `${formatDateOnly(wednesday)}T12:00:00.000Z`,
        durationMinutes: 180,
        billable: true,
        description: "Wednesday work session",
      },
    },
  );
  typia.assert(wednesdayTimelog);
  const fridayTimelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: `${formatDateOnly(friday)}T12:00:00.000Z`,
        durationMinutes: 300,
        billable: false,
        description: "Friday work session",
      },
    },
  );
  typia.assert(fridayTimelog);
  // 6. Create draft timesheet with weekStartDate (Monday)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: `${weekStartDateStr}T00:00:00.000Z`,
      },
    },
  );
  typia.assert(timesheet);
  // 7. Validations
  // Verify the timesheet is created with status 'draft'
  TestValidator.equals(
    "timesheet status should be draft",
    timesheet.status,
    "draft",
  );
  // Verify weekEndDate is auto-calculated as Sunday (weekStartDate + 6 days)
  const expectedWeekEndDateStr = formatDateOnly(
    new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000),
  );
  const actualWeekEndDateStr = timesheet.weekEndDate.substring(0, 10);
  TestValidator.equals(
    "weekEndDate should be Sunday (weekStartDate + 6 days)",
    actualWeekEndDateStr,
    expectedWeekEndDateStr,
  );
  // Verify totalHours equals the sum of all included timelogs' duration
  // 240 + 180 + 300 = 720 minutes = 12 hours
  const expectedTotalHours = 12.0;
  TestValidator.equals(
    "totalHours should be sum of timelog durations",
    timesheet.totalHours,
    expectedTotalHours,
  );
  // Verify all timelogs within the week are auto-associated with the timesheet
  TestValidator.equals(
    "timesheet should contain 3 timelogs",
    timesheet.timesheetTimelogs.length,
    3,
  );
  // Verify the timesheet response includes employee information
  TestValidator.predicate(
    "timesheet should have employee information",
    timesheet.employee !== null && timesheet.employee !== undefined,
  );
  // Verify the timesheet remains in draft status for further management
  TestValidator.equals(
    "timesheet status should remain draft for further management",
    timesheet.status,
    "draft",
  );
}