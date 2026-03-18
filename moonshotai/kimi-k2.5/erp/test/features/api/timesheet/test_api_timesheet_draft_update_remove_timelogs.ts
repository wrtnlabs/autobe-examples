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
 * Test updating a timesheet by removing timelogs and verifying total hours recalculation.
 * 1. Authenticate as a member
 * 2. Create an organization
 * 3. Create a role and organization member
 * 4. Create a project and assign the member
 * 5. Create multiple timelogs for different days of the week
 * 6. Create a draft timesheet
 * 7. Add all timelogs to the timesheet initially
 * 8. Update the timesheet using timelogsToRemove to remove some timelogs
 * 9. Verify the response shows updated timesheet with remaining timelogs only
 * 10. Verify totalHours is recalculated to reflect only the remaining timelogs
 */
export async function test_api_timesheet_draft_update_remove_timelogs(
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
  // 3. Create a role with permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  typia.assert(role);
  // 4. Create organization member linking the user to the organization
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
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 5. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign member to project
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: organizationMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Calculate week boundaries (Sunday to Saturday)
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  // 7. Create multiple timelogs for different days of the week
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(
          weekStart.getTime() + 1 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000,
        ).toISOString(), // Monday 9 AM
        end_time: new Date(
          weekStart.getTime() + 1 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000,
        ).toISOString(), // Monday 5 PM (8 hours)
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(
          weekStart.getTime() + 2 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000,
        ).toISOString(), // Tuesday 9 AM
        end_time: new Date(
          weekStart.getTime() + 2 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000,
        ).toISOString(), // Tuesday 1 PM (4 hours)
        billable: true,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(
          weekStart.getTime() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000,
        ).toISOString(), // Wednesday 10 AM
        end_time: new Date(
          weekStart.getTime() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000,
        ).toISOString(), // Wednesday 4 PM (6 hours)
        billable: false,
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog3);
  // 8. Create a draft timesheet
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 9. Add all timelogs to the timesheet initially
  const timesheetWithLogs =
    await api.functional.erpHrm.member.timesheets.update(memberConnection, {
      timesheetId: timesheet.id,
      body: {
        timelogsToAdd: [timelog1.id, timelog2.id, timelog3.id],
      } satisfies IErpHrmTimesheet.IUpdate,
    });
  typia.assert(timesheetWithLogs);
  // Verify initial state: all 3 timelogs present
  const totalHoursBeforeRemoval = timesheetWithLogs.totalHours;
  TestValidator.equals(
    "initial timelogs count",
    timesheetWithLogs.timelogs.length,
    3,
  );
  TestValidator.equals(
    "initial total hours",
    totalHoursBeforeRemoval,
    (timelog1.durationMinutes +
      timelog2.durationMinutes +
      timelog3.durationMinutes) /
      60,
  );
  // 10. Update the timesheet to remove timelog2
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        timelogsToRemove: [timelog2.id],
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // 11. Verify the response shows updated timesheet with remaining timelogs only
  const remainingTimelogIds = updatedTimesheet.timelogs.map((t) => t.id).sort();
  const expectedRemainingIds = [timelog1.id, timelog3.id].sort();
  TestValidator.equals(
    "remaining timelogs count",
    updatedTimesheet.timelogs.length,
    2,
  );
  TestValidator.equals(
    "remaining timelogs IDs",
    remainingTimelogIds,
    expectedRemainingIds,
  );
  // 12. Verify totalHours is recalculated to reflect only the remaining timelogs
  const expectedHoursAfterRemoval =
    (timelog1.durationMinutes + timelog3.durationMinutes) / 60;
  TestValidator.equals(
    "total hours after removal",
    updatedTimesheet.totalHours,
    expectedHoursAfterRemoval,
  );
  TestValidator.predicate(
    "total hours decreased after removal",
    updatedTimesheet.totalHours < totalHoursBeforeRemoval,
  );
}
