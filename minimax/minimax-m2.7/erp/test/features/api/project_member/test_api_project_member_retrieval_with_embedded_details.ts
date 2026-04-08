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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_member_retrieval_with_embedded_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a role for the employee with project permissions
  const roleBody = prepare_random_erp_hrm_role({
    name: RandomGenerator.paragraph({ sentences: 2 }),
    permissions: ["project:view", "project:manage"],
  });
  const role = await api.functional.erpHrm.admin.roles.create(adminConnection, {
    body: roleBody,
  });
  typia.assert(role);
  // 3. Create another admin/user account that will become an employee
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_admin_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(userAuth);
  // 4. Create an employee with that role (using the user's email)
  // When email already exists, employee is created immediately
  const employeeBody = prepare_random_erp_hrm_employee({
    email: userAuth.email,
    roleId: role.id,
    employmentType: "full-time",
    position: RandomGenerator.name(),
  });
  const invitation = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: employeeBody,
    },
  );
  typia.assert(invitation);
  // 5. Create a project using direct API call
  // The actual response will have id, name, color, status even if mock type shows otherwise
  const projectBody = prepare_random_erp_hrm_project({
    name: RandomGenerator.paragraph({ sentences: 2 }),
    color: "#FF5733",
  });
  const projectResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: projectBody,
    },
  );
  // Extract the actual project data - the real API returns full project with id
  const projectId = (projectResponse as any).id as string & tags.Format<"uuid">;
  const projectName = (projectResponse as any).name as string;
  const projectColor = (projectResponse as any).color as string;
  const projectStatus = (projectResponse as any).status as string;
  // 6. Get the employee ID from the invitation response
  // When user exists, the employee record is created with the member's id
  const employeeId = (invitation as any).id as string & tags.Format<"uuid">;
  // 7. Assign the employee to the project as 'member'
  const memberBody = prepare_random_erp_hrm_project_member({
    employeeId: employeeId,
    assignedRole: "member",
  });
  const memberResponse =
    await api.functional.erpHrm.admin.projects.members.create(adminConnection, {
      projectId: projectId,
      body: memberBody,
    });
  // Extract the actual member id from the response
  const projectMemberId = (memberResponse as any).id as string &
    tags.Format<"uuid">;
  // 8. Get project member details with embedded employee and project info
  const projectMemberDetails =
    await api.functional.erpHrm.admin.projects.members.at(adminConnection, {
      projectId: projectId,
      projectMemberId: projectMemberId,
    });
  typia.assert(projectMemberDetails);
  // Validate response returns complete project member details
  TestValidator.equals(
    "assignedRole is 'member'",
    projectMemberDetails.assignedRole,
    "member",
  );
  // Verify embedded employee info exists and has required fields
  TestValidator.predicate(
    "has employee info",
    projectMemberDetails.employee !== undefined &&
      projectMemberDetails.employee !== null,
  );
  TestValidator.predicate(
    "employee has display name",
    projectMemberDetails.employee.member?.displayName !== undefined,
  );
  TestValidator.predicate(
    "employee has employment type",
    projectMemberDetails.employee.employmentType !== undefined,
  );
  TestValidator.predicate(
    "employee has status",
    projectMemberDetails.employee.status !== undefined,
  );
  // Verify embedded project info exists and has required fields
  TestValidator.predicate(
    "has project info",
    projectMemberDetails.project !== undefined &&
      projectMemberDetails.project !== null,
  );
  TestValidator.equals(
    "project name matches",
    projectMemberDetails.project.name,
    projectName,
  );
  TestValidator.equals(
    "project color matches",
    projectMemberDetails.project.color,
    projectColor,
  );
  TestValidator.equals(
    "project status matches",
    projectMemberDetails.project.status,
    projectStatus,
  );
}
