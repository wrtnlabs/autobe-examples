import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_member_demotion_to_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {},
  );
  typia.assert(department);
  // 3. Create a role with project:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(8),
        permissions: ["project:manage", "project:view"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create an employee using admin's email (links to admin's member record)
  // The admin.id is the member ID, which becomes the employee ID when created this way
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: admin.email,
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  // 5. Create a project
  const projectInput = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectInput);
  const project = projectInput as IErpHrmProject & { id: string };
  // 6. Assign the employee to the project as project_lead
  // Use admin.id as employee ID since it was created for admin's member
  const memberInput = await generate_random_erp_hrm_admin_projects_members_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        employeeId: admin.id,
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(memberInput);
  const projectMember = memberInput as IErpHrmProjectMember & { id: string };
  // 7. Demote the project member from project_lead to member
  const updatedInput =
    await api.functional.erpHrm.admin.projects.members.update(adminConnection, {
      projectId: project.id,
      projectMemberId: projectMember.id,
      body: {
        assignedRole: "member",
      } satisfies IErpHrmProjectMember.IUpdate,
    });
  typia.assert(updatedInput);
  const updatedMember = updatedInput as typeof updatedInput & { assignedRole: string; memberCount: number; projectLeadCount: number };
  // Validations
  TestValidator.equals(
    "assigned_role should be 'member'",
    updatedMember.assignedRole,
    "member",
  );
  TestValidator.equals(
    "memberCount should be 1 after demotion",
    updatedMember.memberCount,
    1,
  );
  TestValidator.equals(
    "projectLeadCount should be 0 after demotion",
    updatedMember.projectLeadCount,
    0,
  );
}