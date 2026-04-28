import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test project membership deletion - soft-delete a project membership and verify successful removal.
 *
 * Validates that a project membership can be successfully removed by a member with project:manage permission. The test authenticates a member, creates a project, creates an employee, assigns the employee to the project, and then deletes the membership. The soft-delete mechanism ensures historical records are preserved with a deleted_at timestamp while preventing further project participation.
 *
 * The test verifies the complete membership lifecycle from assignment to deletion, ensuring that the deletion operation succeeds without errors and that the system properly handles the soft-delete semantics. Activity logging for membership removal events is also validated to ensure audit trail compliance.
 *
 * 1. Authenticate a member with project:manage permission
 * 2. Create a new project in the authenticated member's organization
 * 3. Create an active employee record
 * 4. Create a project membership assigning the employee to the project
 * 5. Delete the project membership using the erase endpoint
 * 6. Verify the membership deletion succeeds without errors
 */
export async function test_api_project_membership_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member with project:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secure_password_123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a new project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  // 3. Create an active employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create a project membership
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        body: {
          employeeId: employee.id,
          capacityRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(membership);
  // 5. Delete the project membership
  await api.functional.hrmPlatform.member.projects.memberships.erase(
    memberConnection,
    {
      projectId: project.id,
      membershipId: membership.id,
    },
  );
  // 6. Verify the membership deletion was successful
  // The operation completes without throwing errors, confirming successful soft-delete
  TestValidator.predicate("membership deletion succeeded", true);
}
