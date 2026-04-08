import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test project member removal when membership does not exist.
 *
 * Validates the system correctly returns 404 Not Found when attempting to remove a project membership that does not exist. This tests the business logic where an employee exists in the organization but is not assigned to the specified project, and the removal operation should fail with a 404 error indicating the membership record was not found.
 *
 * The test ensures that:
 *
 * 1. Member authentication succeeds with project:manage permission.
 * 2. Project creation succeeds within the organization.
 * 3. Employee invitation succeeds (employee exists in organization but not assigned to project).
 * 4. Removal attempt returns 404 Not Found (no membership record exists).
 * 5. The error correctly identifies the missing membership, not missing project or employee.
 *
 * This validates the business rule that project member removal requires an existing membership record between the employee and project.
 */
export async function test_api_project_member_removal_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Invite and create an employee in the organization (NOT assigned to project)
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {},
    );
  typia.assert(invitation);
  // 4. Attempt to remove the employee from the project (should fail with 404)
  await TestValidator.httpError("membership not found", 404, async () => {
    await api.functional.hrmPlatform.member.projects.members.erase(
      memberConnection,
      {
        projectId: project.id,
        employeeId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
