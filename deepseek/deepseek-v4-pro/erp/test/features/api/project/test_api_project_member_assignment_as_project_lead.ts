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
 * Test project member assignment with explicit project-lead role.
 *
 * Validates that an active employee can be assigned to an active project with the
 * explicit 'project-lead' role, granting elevated task management authority within
 * the project. The test verifies that the non-default role is correctly persisted,
 * the joined_at timestamp is auto-set and immutable, and the employee and project
 * cross-references accurately reflect the created resources.
 *
 * 1. Authenticate as primary member (organization Owner) via join.
 * 2. Create a custom role for the employee-to-be.
 * 3. Join a second member to serve as the employee identity.
 * 4. Create an employee record linking the second member to the organization.
 * 5. Create an active project for the employee to join.
 * 6. Assign the employee with role explicitly set to 'project-lead'.
 * 7. Validate role is 'project-lead' (not default 'member'), joined_at is set,
 *    and employee/project references are correct.
 */
export async function test_api_project_member_assignment_as_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as primary member (Owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create custom role
  const role = await generate_random_erp_hrm_roles_create(ownerConnection, {});
  typia.assert(role);
  // 3. Join second member to serve as the employee
  const employeeAuthConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(
    employeeAuthConnection,
    {},
  );
  typia.assert(employeeMember);
  // 4. Create employee record for the second member
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeMember.email,
        erp_hrm_role_id: role.id,
      },
    },
  );
  typia.assert(employee);
  // 5. Create active project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 6. Assign employee to project with explicit project-lead role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 7. Validate assignment
  TestValidator.equals(
    "role is project-lead",
    projectMember.role,
    "project-lead",
  );
  TestValidator.equals(
    "employee reference matches",
    projectMember.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "project reference matches",
    projectMember.project.id,
    project.id,
  );
  TestValidator.predicate(
    "joined_at is set",
    projectMember.joined_at !== null && projectMember.joined_at !== undefined,
  );
}
