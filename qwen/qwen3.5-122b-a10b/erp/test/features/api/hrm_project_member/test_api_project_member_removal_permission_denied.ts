import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

/**
 * Test project member removal permission denial for unauthorized users.
 *
 * Validates that users without project:manage permission cannot remove employees from projects. This test ensures proper access control enforcement on project membership operations.
 *
 * The test creates two member accounts with different permission levels, establishes a project with member assignment using the privileged account, then attempts removal using the unprivileged account.
 *
 * 1. Register two member accounts with different roles.
 * 2. Create a project using the manager account.
 * 3. Assign an employee to the project using the manager account.
 * 4. Attempt to remove the employee from the project using the regular employee account.
 * 5. Verify the operation is rejected with HTTP 403 Forbidden.
 */
export async function test_api_project_member_removal_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register two member accounts
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(managerAuth);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 2. Create a project using the manager account
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      managerConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Assign an employee to the project using the manager account
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const projectMember =
    await generate_random_hrm_member_projects_members_create(
      managerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: employeeId,
          role: "member" satisfies IHrmProjectMember.ICreate["role"],
        } satisfies IHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 4. Attempt to remove the employee from the project using the employee account
  // This should fail with HTTP 403 Forbidden
  await TestValidator.httpError(
    "project member removal should be forbidden without project:manage permission",
    403,
    async () => {
      await api.functional.hrm.member.projects.members.erase(
        employeeConnection,
        {
          projectId: project.id,
          employeeId: employeeId,
        },
      );
    },
  );
}
