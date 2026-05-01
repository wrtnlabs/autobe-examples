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
 * Test that assigning the same employee to a project twice is rejected with a 409 Conflict.
 *
 * Validates the duplicate prevention business rule on the project member assignment endpoint.
 * The unique constraint on [erp_hrm_employee_id, erp_hrm_project_id] ensures that an employee
 * cannot hold duplicate project membership records for the same project — the membership
 * relationship is single and exclusive.
 *
 * 1. Member joins and authenticates with the platform, obtaining session-scoped credentials.
 * 2. A custom role is created within the organization to grant necessary permissions.
 * 3. An active employee is invited using the custom role, establishing their organizational identity.
 * 4. A project is created in active status to serve as the target for member assignment.
 * 5. The employee is successfully assigned to the project with role "member" — returns 201 with
 *    the full membership record including the immutable joined_at timestamp.
 * 6. A second assignment attempt with the identical employee and project combination is made,
 *    which must be rejected with a 409 Conflict, confirming the unique constraint enforcement
 *    at the database level.
 */
export async function test_api_project_member_duplicate_assignment_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create an employee with the custom role
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: {
        erp_hrm_role_id: role.id,
      } satisfies Partial<IErpHrmEmployee.ICreate>,
    },
  );
  typia.assert(employee);
  // 4. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. First assignment - succeeds with 201
  const membership =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee.id,
          role: "member",
        } satisfies Partial<IErpHrmProjectMember.ICreate>,
        params: { projectId: project.id },
      },
    );
  typia.assert(membership);
  // 6. Second assignment - must be rejected with 409 Conflict
  await TestValidator.error(
    "duplicate project member assignment rejected",
    async () => {
      await api.functional.erpHrm.member.projects.members.create(
        memberConnection,
        {
          projectId: project.id,
          body: {
            erp_hrm_employee_id: employee.id,
            role: "member",
          } satisfies IErpHrmProjectMember.ICreate,
        },
      );
    },
  );
}
