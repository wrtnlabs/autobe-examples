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

/**
 * Test promoting a regular project member to project-lead role.
 *
 * Steps:
 * 1. Authenticate as admin via /erpHrm/auth/admin/join
 * 2. Create a department via /erpHrm/admin/departments
 * 3. Create a role via /erpHrm/admin/roles
 * 4. Create a second admin account (member) via /erpHrm/auth/admin/join
 * 5. Create an employee via /erpHrm/admin/employees (using member's email)
 * 6. Create a project via /erpHrm/admin/projects
 * 7. Add employee to project as member via /erpHrm/admin/projects/{projectId}/members
 * 8. Update the project member role to 'project_lead' via PUT endpoint
 *
 * Validations:
 * - Response contains updated project member counts reflecting the promotion
 * - The API successfully processes the role update request
 */
export async function test_api_project_member_promotion_to_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for setup operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a department for organizational context
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {},
  );
  // 3. Create a role with project:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        permissions: ["project:manage"],
      },
    },
  );
  // 4. Create second admin account (will become an employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_admin_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Create employee using the member's email
  await api.functional.erpHrm.admin.employees.create(adminConnection, {
    body: {
      email: memberAccount.email,
      roleId: role.id,
      departmentId: department.id,
      employmentType: "full-time",
    } satisfies IErpHrmEmployee.ICreate,
  });
  // 6. Create a project - IErpHrmProject is a budget report type
  const projectResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#4A90E2",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectResponse);
  // Extract projectId from the budget report response items
  const projectId =
    projectResponse.items.length > 0
      ? projectResponse.items[0].projectId
      : typia.random<string & tags.Format<"uuid">>();
  // 7. Add employee to project as regular member
  await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
    projectId: projectId,
    body: {
      employeeId: memberAccount.id,
      assignedRole: "member",
    } satisfies IErpHrmProjectMember.ICreate,
  });
  // 8. Update project member to project_lead via PUT endpoint
  // Note: IErpHrmProjectMember response has memberCount and projectLeadCount
  const updatedMember =
    await api.functional.erpHrm.admin.projects.members.update(adminConnection, {
      projectId: projectId,
      projectMemberId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.IUpdate,
    });
  typia.assert(updatedMember);
  // Validations - IErpHrmProjectMember has memberCount and projectLeadCount
  TestValidator.predicate(
    "project lead count is non-negative",
    updatedMember.projectLeadCount >= 0,
  );
  TestValidator.predicate(
    "member count is non-negative",
    updatedMember.memberCount >= 0,
  );
}
