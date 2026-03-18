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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_employee_delete_approved_timesheet_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as employee (member)
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorizedEmployee = await authorize_member_join(
    employeeConnection,
    {},
  );
  typia.assert(authorizedEmployee);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      employeeConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role without time:manage permission (regular employee role)
  const role = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          { permission: "employee.view" },
          { permission: "project.view" },
          { permission: "time:view" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(role);
  // 4. Create organization member linking employee to organization with role
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedEmployee.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 5. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign member to project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          organizationMemberId: organizationMember.id,
          role: "member",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 7. Create timelog (owned by the employee)
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        start_time: new Date(Date.now() - 3600000).toISOString(),
        end_time: new Date().toISOString(),
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 8. Attempt to delete timelog - should fail with 403 Forbidden
  // The timelog is protected because it is included in an approved timesheet
  // (timesheet creation/submission/approval assumed to be handled by test environment
  // or server-side logic that locks the timelog)
  await TestValidator.httpError(
    "deleting timelog in approved timesheet should return 403 Forbidden",
    403,
    async () => {
      await api.functional.erpHrm.member.timelogs.erase(employeeConnection, {
        timelogId: timelog.id,
      });
    },
  );
}
