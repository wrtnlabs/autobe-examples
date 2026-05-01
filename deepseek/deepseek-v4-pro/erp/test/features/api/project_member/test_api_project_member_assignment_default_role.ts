import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test project member assignment with default role fallback.
 *
 * Verifies that when an active employee is assigned to an active project without specifying a membership role in the request body, the server defaults the role to "member". The test covers the full setup flow: member authentication via join, custom role creation, employee registration through invitation, project creation, and the actual membership assignment.
 *
 * Special attention is given to validating that the role field is "member" despite no role being provided in the request, confirming the server-side default behavior. Employee identity linking, project identity linking, and timestamp integrity (joined_at immutability, created_at/updated_at presence) are also verified.
 *
 * 1. Admin member joins and authenticates to establish organization context.
 * 2. A second member registers separately to serve as the employee target.
 * 3. A custom role with permissions is created in the organization.
 * 4. The second member is invited as an active employee with the custom role.
 * 5. An active project is created for membership assignment.
 * 6. The employee is assigned to the project without specifying a role — server defaults to "member".
 * 7. Validates membership role, employee and project references, and all timestamp fields.
 */
export async function test_api_project_member_assignment_default_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin member joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {});
  typia.assert(adminMember);
  // 2. Second member registers to serve as the employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(
    employeeMemberConnection,
    {},
  );
  typia.assert(employeeMember);
  // 3. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(adminConnection, {});
  typia.assert(role);
  // 4. Invite the second member as an active employee
  const employee = await generate_random_erp_hrm_member_employees_create(
    adminConnection,
    {
      body: {
        email: employeeMember.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign employee to project without specifying a role
  const membership = await api.functional.erpHrm.member.projects.members.create(
    adminConnection,
    {
      projectId: project.id,
      body: {
        erp_hrm_employee_id: employee.id,
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(membership);
  // 7. Validate default role and references
  TestValidator.equals("default role is member", membership.role, "member");
  TestValidator.equals(
    "employee id matches",
    membership.employee.id,
    employee.id,
  );
  TestValidator.equals("project id matches", membership.project.id, project.id);
  TestValidator.predicate(
    "joined_at is populated",
    membership.joined_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is populated",
    membership.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    membership.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active membership",
    membership.deleted_at,
    null,
  );
}
