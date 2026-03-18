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

export async function test_api_timelog_timesheet_lock_blocks_employee_edit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  // Step 2: Create organization
  const organization: IErpHrmOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  // Step 3: Create role for organization member assignment
  const role: IErpHrmRole = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {},
  );
  // Step 4: Create organization member linking user to organization
  const organizationMember: IErpHrmOrganizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        },
      },
    );
  // Step 5: Create project to log time against
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {});
  // Step 6: Assign member to project so they can create timelogs
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: organizationMember.id,
        role: "member",
      },
    },
  );
  // Step 7: Create timelog with specific date
  const workDate = new Date();
  workDate.setHours(0, 0, 0, 0);
  const startTime = new Date(workDate);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(workDate);
  endTime.setHours(17, 0, 0, 0);
  const timelog: IErpHrmTimelog =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        project_id: project.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        billable: true,
        description: "Initial work session description",
      },
    });
  typia.assert(timelog);
  // Step 8: Create timesheet for the week containing the timelog
  const weekStart = new Date(workDate);
  weekStart.setDate(workDate.getDate() - workDate.getDay()); // Sunday start
  weekStart.setHours(0, 0, 0, 0);
  const timesheet: IErpHrmTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(memberConnection, {
      body: {
        weekStartDate: weekStart.toISOString(),
      },
    });
  typia.assert(timesheet);
  // Step 9: Submit the timesheet to trigger the lock constraint
  const submittedTimesheet: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Step 10: Attempt to update the timelog - should be blocked with 403
  await TestValidator.httpError(
    "should block editing timelog in submitted timesheet",
    403,
    async () => {
      await api.functional.erpHrm.member.timelogs.update(memberConnection, {
        timelogId: timelog.id,
        body: {
          description: "Attempted modification after timesheet submission",
          startTime: new Date(startTime.getTime() + 60000).toISOString(),
          endTime: new Date(endTime.getTime() + 60000).toISOString(),
        } satisfies IErpHrmTimelog.IUpdate,
      });
    },
  );
}
