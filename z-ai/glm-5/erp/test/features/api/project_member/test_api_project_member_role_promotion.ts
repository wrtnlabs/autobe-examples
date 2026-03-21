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

/**
 * Test project member role promotion workflow.
 * 1. Manager creates organization (via authorize_member_join)
 * 2. Manager creates project
 * 3. Manager creates employee
 * 4. Manager adds employee to project as member
 * 5. Manager updates employee's role to project_lead
 * 6. Verify role change and updated_at timestamp
 */
export async function test_api_project_member_role_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager connection with project:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 2. Create project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee for the team member
  const employee = await generate_random_erp_hrm_member_employees_create(
    managerConnection,
    {},
  );
  typia.assert(employee);
  // 4. Add employee to project with 'member' role
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Store original timestamp for comparison
  const originalUpdatedAt: string = projectMember.updated_at;
  // 5. Update role to project_lead
  const updatedMember =
    await api.functional.erpHrm.member.projects.members.update(
      managerConnection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
        body: {
          role: "project_lead",
        } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 6. Verify role change
  TestValidator.equals(
    "role should be project_lead",
    updatedMember.role,
    "project_lead",
  );
  // 7. Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at should be refreshed",
    new Date(updatedMember.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // 8. Verify employee relation is included
  typia.assert(updatedMember.employee);
  // 9. Verify project relation is included
  typia.assert(updatedMember.project);
}
