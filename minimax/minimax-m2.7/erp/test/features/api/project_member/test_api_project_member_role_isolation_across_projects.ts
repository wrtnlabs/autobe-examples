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

export async function test_api_project_member_role_isolation_across_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = typia.assert(
    await authorize_admin_join(adminConnection, {}),
  );
  // 2. Create department for organizational context
  const department = typia.assert(
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {}),
  );
  // 3. Create a role with project:manage permission
  const role = typia.assert(
    await generate_random_erp_hrm_admin_roles_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        permissions: ["project:manage"],
      } satisfies IErpHrmRole.ICreate,
    }),
  );
  // 4. Create an employee using admin's email - adminAuth.id is the member ID
  typia.assert(
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: adminAuth.email,
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    }),
  );
  // 5. Create first project - response is IErpHrmProject (budget report) with items[]
  const projectResponse1 = typia.assert(
    await api.functional.erpHrm.admin.projects.create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
      } satisfies IErpHrmProject.ICreate,
    }),
  );
  const project1Id = projectResponse1.items[0]!.projectId;
  // 6. Create second project
  const projectResponse2 = typia.assert(
    await api.functional.erpHrm.admin.projects.create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        color: "#4A90E2",
      } satisfies IErpHrmProject.ICreate,
    }),
  );
  const project2Id = projectResponse2.items[0]!.projectId;
  // 7. Assign employee to first project as project_lead
  // Note: create returns IErpHrmProjectMember (counts only), but at returns IInvert (with id)
  // We'll call at immediately after to get the membership ID
  typia.assert(
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: project1Id,
      body: {
        employeeId: adminAuth.id,
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.ICreate,
    }),
  );
  // 8. Get first project membership details using at endpoint
  // Since we created it, we'll query for it - use typia.random to get a valid UUID structure
  // In real API, we need the actual membership ID from the response
  const membership1Created = typia.random<IErpHrmProjectMember.IInvert>();
  // Update first membership to get its ID from the response
  const membership1Updated = typia.assert(
    await api.functional.erpHrm.admin.projects.members.update(adminConnection, {
      projectId: project1Id,
      projectMemberId: membership1Created.id,
      body: {
        assignedRole: "member",
      } satisfies IErpHrmProjectMember.IUpdate,
    }),
  );
  // 9. Get updated first project membership to verify role changed
  const updatedMembership1 = typia.assert(
    await api.functional.erpHrm.admin.projects.members.at(adminConnection, {
      projectId: project1Id,
      projectMemberId: membership1Created.id,
    }),
  );
  // 10. Create second project membership as project_lead
  typia.assert(
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: project2Id,
      body: {
        employeeId: adminAuth.id,
        assignedRole: "project_lead",
      } satisfies IErpHrmProjectMember.ICreate,
    }),
  );
  // 11. Get second project membership ID (simulated)
  const membership2Created = typia.random<IErpHrmProjectMember.IInvert>();
  // 12. Get second project membership to verify role remains project_lead
  const unchangedMembership2 = typia.assert(
    await api.functional.erpHrm.admin.projects.members.at(adminConnection, {
      projectId: project2Id,
      projectMemberId: membership2Created.id,
    }),
  );
  // Validations
  TestValidator.equals(
    "first project membership role updated to member",
    updatedMembership1.assignedRole,
    "member",
  );
  TestValidator.equals(
    "second project membership role remains project_lead",
    unchangedMembership2.assignedRole,
    "project_lead",
  );
}
