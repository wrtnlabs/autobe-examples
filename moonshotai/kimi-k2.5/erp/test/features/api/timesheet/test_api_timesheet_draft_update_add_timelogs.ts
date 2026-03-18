import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test the primary success path for updating a draft timesheet by adding timelogs.
 * This validates the core business workflow where employees collect their weekly time entries into a timesheet for submission.
 */
export async function test_api_timesheet_draft_update_add_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a role with employee permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        permissions: [
          { permission: "employee.view" },
          { permission: "employee.manage" },
          { permission: "project.view" },
          { permission: "project.manage" },
          { permission: "time.manage" },
          { permission: "timesheet.manage" },
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Create organization member for the authenticated user
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  typia.assert(organizationMember);
  // 5. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign the member to the project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: organizationMember.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 8. Create a draft timesheet for the week first (to get proper week boundaries)
  const weekStartDate = new Date();
  weekStartDate.setHours(0, 0, 0, 0);
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay()); // Start of week (Sunday)
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6); // End of week (Saturday)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate.toISOString(),
        weekEndDate: weekEndDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet has no timelogs initially",
    timesheet.timelogs.length,
    0,
  );
  TestValidator.equals(
    "timesheet totalHours is 0 initially",
    timesheet.totalHours,
    0,
  );
  // 7. Create timelogs for the member against the project (within the timesheet week)
  // Create timelogs on Monday and Tuesday of the same week
  const mondayDate = new Date(weekStartDate);
  mondayDate.setDate(mondayDate.getDate() + 1); // Monday
  mondayDate.setHours(9, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: mondayDate.toISOString(),
        end_time: new Date(
          mondayDate.getTime() + 2 * 60 * 60 * 1000,
        ).toISOString(),
        billable: true,
        description: "Development work",
      },
    },
  );
  typia.assert(timelog1);
  const tuesdayDate = new Date(weekStartDate);
  tuesdayDate.setDate(tuesdayDate.getDate() + 2); // Tuesday
  tuesdayDate.setHours(10, 0, 0, 0);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: tuesdayDate.toISOString(),
        end_time: new Date(
          tuesdayDate.getTime() + 3 * 60 * 60 * 1000,
        ).toISOString(),
        billable: false,
        description: "Meeting and planning",
      },
    },
  );
  typia.assert(timelog2);
  // Verify timelogs have no timesheet association initially
  TestValidator.equals(
    "timelog1 has no timesheet initially",
    timelog1.timesheet,
    null,
  );
  TestValidator.equals(
    "timelog2 has no timesheet initially",
    timelog2.timesheet,
    null,
  );
  // 9. Update the timesheet by adding the created timelogs
  const updateBody = {
    timelogsToAdd: [timelog1.id, timelog2.id],
  } satisfies IErpHrmTimesheet.IUpdate;
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTimesheet);
  // 10. Verify the response shows updated timesheet with added timelogs and recalculated totalHours
  TestValidator.equals(
    "timesheet still in draft status",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet has 2 timelogs",
    updatedTimesheet.timelogs.length,
    2,
  );
  TestValidator.predicate(
    "totalHours is greater than 0",
    updatedTimesheet.totalHours > 0,
  );
  // Calculate expected total hours (convert minutes to hours properly)
  const expectedTotalHours =
    (timelog1.durationMinutes + timelog2.durationMinutes) / 60.0;
  TestValidator.equals(
    "totalHours matches sum of timelog durations",
    updatedTimesheet.totalHours,
    expectedTotalHours,
  );
  // Verify both timelogs are present in the timesheet
  const timelogIds = updatedTimesheet.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "timelog1 is in timesheet",
    timelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 is in timesheet",
    timelogIds.includes(timelog2.id),
  );
  // 11. Verify timelogs now have timesheet_id association
  const updatedTimelog1 = updatedTimesheet.timelogs.find(
    (t) => t.id === timelog1.id,
  )!;
  const updatedTimelog2 = updatedTimesheet.timelogs.find(
    (t) => t.id === timelog2.id,
  )!;
  TestValidator.equals(
    "timelog1 has timesheet association",
    updatedTimelog1.timesheet?.id,
    timesheet.id,
  );
  TestValidator.equals(
    "timelog2 has timesheet association",
    updatedTimelog2.timesheet?.id,
    timesheet.id,
  );
}