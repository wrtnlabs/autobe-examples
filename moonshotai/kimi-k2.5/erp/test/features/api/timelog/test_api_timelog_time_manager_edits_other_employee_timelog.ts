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

export async function test_api_timelog_time_manager_edits_other_employee_timelog(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as regular employee (timelog owner)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  const employeeId = employeeAuth.id;
  // Step 2: Create organization as employee (employee becomes owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      employeeConnection,
      {},
    );
  const organizationId = organization.id;
  // Step 3: Create role for regular employee
  const employeeRole = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  // Step 4: Create organization member for regular employee
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organizationId,
          userId: employeeId,
          roleId: employeeRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // Step 5: Create another employee to reassign timelog to
  const targetEmployeeConnection: api.IConnection = { host: connection.host };
  const targetEmployeeAuth = await authorize_member_join(
    targetEmployeeConnection,
    {},
  );
  const targetEmployeeRole = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  const targetEmployeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organizationId,
          userId: targetEmployeeAuth.id,
          roleId: targetEmployeeRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // Step 6: Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  // Step 7: Assign regular employee to project
  await generate_random_erp_hrm_member_projects_members_create(
    employeeConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: employeeOrgMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Step 8: Create timelog as regular employee
  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        start_time: startTime,
        end_time: endTime,
        billable: false,
        description: "Original work description",
      } satisfies IErpHrmTimelog.ICreate,
    },
  );
  // Step 9: Authenticate as time manager
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  // Step 10: Create role with time:manage permission
  const managerRole = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          { permission: "time:manage" } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  // Step 11: Create organization member for time manager
  const managerOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organizationId,
          userId: managerAuth.id,
          roleId: managerRole.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // Step 12: Assign time manager to project
  await generate_random_erp_hrm_member_projects_members_create(
    employeeConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: managerOrgMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Step 13: As time manager, update the timelog with new values and reassign
  const newStartTime = new Date(
    now.getTime() - 3 * 60 * 60 * 1000,
  ).toISOString();
  const newEndTime = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const newDescription = "Updated work description by time manager";
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    managerConnection,
    {
      timelogId: timelog.id,
      body: {
        startTime: newStartTime,
        endTime: newEndTime,
        description: newDescription,
        organizationMemberId: targetEmployeeOrgMember.id,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // Step 14: Validate updates
  TestValidator.equals(
    "start time updated",
    updatedTimelog.startTime,
    newStartTime,
  );
  TestValidator.equals("end time updated", updatedTimelog.endTime, newEndTime);
  TestValidator.equals(
    "description updated",
    updatedTimelog.description,
    newDescription,
  );
  TestValidator.equals(
    "organization member reassigned",
    updatedTimelog.organizationMember.id,
    targetEmployeeOrgMember.id,
  );
  TestValidator.predicate(
    "duration recalculated correctly",
    updatedTimelog.durationMinutes === 150,
  );
}
