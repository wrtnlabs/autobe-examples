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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timelog_deletion_by_time_manage_permission_bypass(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin member — becomes organization owner with all permissions
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {});
  // 2. Create organization — admin automatically becomes Owner (has time:manage)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register employee member
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // 4. Create a role for the employee (basic role with minimal permissions)
  const employeeRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      adminConnection,
      {
        body: {
          name: "Employee-" + RandomGenerator.alphabets(6),
          permissions: ["time:view_all"],
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(employeeRole);
  // 5. Add employee to the organization with the custom role
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      adminConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: employeeRole.id,
          employmentType: "full-time",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(orgMember);
  // 6. Create an active project using admin connection (admin has project:manage)
  const project = await generate_random_erp_hrm_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 7. Add employee to project as member so they can log time
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      adminConnection,
      {
        body: {
          organizationMemberId: orgMember.id,
          projectRole: "member",
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 8. Employee creates a timelog for the project on a Monday
  const workDate = new Date("2026-03-09T00:00:00.000Z").toISOString();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        work_date: workDate,
        duration_minutes: 60,
        billable: false,
      },
    },
  );
  typia.assert(timelog);
  // 9. Employee creates a weekly timesheet covering the timelog's work_date
  // weekStartDate = Monday 2026-03-09, weekEndDate = Sunday 2026-03-15 (exactly 6 days later)
  const weekStartDate = new Date("2026-03-09T00:00:00.000Z").toISOString();
  const weekEndDate = new Date("2026-03-15T00:00:00.000Z").toISOString();
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        weekStartDate,
        weekEndDate,
      },
    },
  );
  typia.assert(timesheet);
  // 10. Employee submits the timesheet — status becomes 'submitted', locking the timelog
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Pre-condition: verify the timesheet is in submitted status (timelog is now locked)
  TestValidator.equals(
    "timesheet status is submitted before admin deletion",
    submittedTimesheet.status,
    "submitted",
  );
  // 11. Admin deletes the employee's locked timelog
  // Admin has time:manage permission as organization Owner — bypasses the submitted-timesheet restriction
  await api.functional.erpHrm.member.timelogs.erase(adminConnection, {
    timelogId: timelog.id,
  });
  // If no exception is thrown, the admin successfully deleted the locked timelog
  // Business rule verified: members with time:manage can delete timelogs in submitted timesheets
}
