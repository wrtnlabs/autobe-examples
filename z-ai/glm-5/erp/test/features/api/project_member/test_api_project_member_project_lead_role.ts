import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member with owner role (has project:manage permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create an employee who will be assigned as project_lead
  // Note: The utility function handles role assignment internally
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {},
  );
  typia.assert(employee);
  // 4. Assign the employee as project_lead to the project
  const projectMember =
    await api.functional.erpHrm.member.projects.members.create(
      ownerConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employee.id,
          role: "project_lead",
        } satisfies IErpHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Verify response has role = 'project_lead'
  TestValidator.equals(
    "project member role",
    projectMember.role,
    "project_lead",
  );
  // 6. Verify employee details are correctly populated
  TestValidator.equals(
    "employee id matches",
    projectMember.employee.id,
    employee.id,
  );
  TestValidator.predicate(
    "employee has member info",
    () => projectMember.employee.member !== null,
  );
  // 7. Verify project details are correctly populated
  TestValidator.equals(
    "project id matches",
    projectMember.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    projectMember.project.name,
    project.name,
  );
  // 8. Verify timestamps are set correctly
  TestValidator.predicate("created_at is valid", () => {
    const createdAt = new Date(projectMember.created_at);
    return !isNaN(createdAt.getTime()) && createdAt.getTime() > 0;
  });
  TestValidator.predicate("updated_at is valid", () => {
    const updatedAt = new Date(projectMember.updated_at);
    return !isNaN(updatedAt.getTime()) && updatedAt.getTime() > 0;
  });
  TestValidator.equals(
    "deleted_at is null for active membership",
    projectMember.deleted_at,
    null,
  );
}
