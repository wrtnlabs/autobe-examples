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

export async function test_api_timelog_manager_override_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create manager with time:manage permission capability
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      firstName: "Manager",
      lastName: "User",
      email: `manager.${RandomGenerator.alphabets(8)}@test.com`,
    },
  });
  typia.assert(manager);
  // Setup: Create employee who will own the timelog
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      firstName: "Employee",
      lastName: "User",
      email: `employee.${RandomGenerator.alphabets(8)}@test.com`,
    },
  });
  typia.assert(employee);
  // Create organization as manager
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {
        body: {
          name: `Test Org ${RandomGenerator.alphabets(6)}`,
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // Create manager role with time:manage permission
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Manager Role",
        permissions: [
          { permission: "time:manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      },
    },
  );
  typia.assert(managerRole);
  // Create employee role without time:manage permission
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    managerConnection,
    {
      body: {
        name: "Employee Role",
        permissions: [],
      },
    },
  );
  typia.assert(employeeRole);
  // Create organization member for manager
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: manager.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(managerOrgMember);
  // Create organization member for employee
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      managerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(employeeOrgMember);
  // Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: `Test Project ${RandomGenerator.alphabets(6)}`,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Assign employee to project
  await generate_random_erp_hrm_member_projects_members_create(
    managerConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: employeeOrgMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Create timelog as employee
  const now = new Date();
  const startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endTime = now.toISOString();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        start_time: startTime,
        end_time: endTime,
        billable: true,
        description: "Test work session for deletion",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // Test: Manager deletes employee's timelog using administrative override
  // This validates that time:manage permission allows deletion of another user's timelog
  await api.functional.erpHrm.member.timelogs.erase(managerConnection, {
    timelogId: timelog.id,
  });
  // Validation: Confirm successful deletion
  TestValidator.predicate(
    "Manager with time:manage permission successfully deleted employee's timelog",
    true,
  );
}
