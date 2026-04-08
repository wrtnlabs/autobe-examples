import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_retrieval_by_viewall_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and organization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Create viewer role with time:view_all permission
  const viewerRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Viewer ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["time:view_all", "employee:view", "project:view"],
      },
    },
  );
  typia.assert(viewerRole);
  // 3. Create regular Employee role (built-in)
  const employeeRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Employee Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: [],
      },
    },
  );
  typia.assert(employeeRole);
  // 4. Create project for time logging
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  const projectId = (project as IErpHrmProject & { id: string }).id;
  // 5. Create timesheet owner employee
  const ownerMemberConnection: api.IConnection = { host: connection.host };
  const ownerMemberAuth = await authorize_member_join(
    ownerMemberConnection,
    {},
  );
  typia.assert(ownerMemberAuth);
  const ownerEmployee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: ownerMemberAuth.email,
        roleId: employeeRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(ownerEmployee);
  // 6. Set organization context for owner
  const ownerOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      ownerMemberConnection,
      {
        body: {
          organizationId: adminAuth.id, // Using admin's organization
        },
      },
    );
  typia.assert(ownerOrgContext);
  // 7. Create viewer employee
  const viewerMemberConnection: api.IConnection = { host: connection.host };
  const viewerMemberAuth = await authorize_member_join(
    viewerMemberConnection,
    {},
  );
  typia.assert(viewerMemberAuth);
  const viewerEmployee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: viewerMemberAuth.email,
        roleId: viewerRole.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(viewerEmployee);
  // 8. Assign owner employee to project
  const projectMember =
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectId },
        body: {
          employeeId: ownerEmployee.id,
          assignedRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 9. Create timelogs for owner employee
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    ownerMemberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "First timelog entry",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    ownerMemberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date().toISOString(),
        durationMinutes: 180,
        description: "Second timelog entry",
        billable: false,
      },
    },
  );
  typia.assert(timelog2);
  // 10. Create timesheet for owner employee
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    ownerMemberConnection,
    {
      body: {
        weekStartDate: new Date().toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 11. Set organization context for viewer
  const viewerOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      viewerMemberConnection,
      {
        body: {
          organizationId: adminAuth.id, // Using admin's organization
        },
      },
    );
  typia.assert(viewerOrgContext);
  // 12. Viewer retrieves other employee's timesheet using time:view_all permission
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    viewerMemberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrievedTimesheet);
  // 13. Validate the retrieved timesheet
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "employee is the owner, not viewer",
    retrievedTimesheet.employee.id,
    ownerEmployee.id,
  );
  TestValidator.equals(
    "employee email matches owner",
    retrievedTimesheet.employee.member.email,
    ownerMemberAuth.email,
  );
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  TestValidator.predicate(
    "has timelogs",
    retrievedTimesheet.timesheetTimelogs.length > 0,
  );
  TestValidator.predicate(
    "total hours greater than 0",
    retrievedTimesheet.totalHours > 0,
  );
}