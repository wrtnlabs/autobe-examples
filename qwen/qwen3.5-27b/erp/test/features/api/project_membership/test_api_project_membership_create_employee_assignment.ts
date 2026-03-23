import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test project membership creation for employee assignment to a project.
 *
 * This test validates the core workflow of assigning an employee to a project:
 * 1. Authenticate as a member (which creates an employee record)
 * 2. Create a project within the organization
 * 3. Assign the employee to the project with a specific role
 * 4. Verify the membership record is created correctly
 */
export async function test_api_project_membership_create_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (creates employee automatically)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a project in the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: undefined },
  );
  typia.assert(project);
  // 3. Create project membership assigning the employee to the project
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: member.id,
          role: "member",
        } satisfies IHrmPlatformProjectMembership.ICreate,
      },
    );
  typia.assert(membership);
  // 4. Validate business logic of membership record
  TestValidator.equals(
    "employee_id matches authenticated member",
    membership.employee.id,
    member.id,
  );
  TestValidator.equals(
    "project_id matches created project",
    membership.project.id,
    project.id,
  );
  TestValidator.equals("role is set to member", membership.role, "member");
  TestValidator.equals(
    "deleted_at is null for active membership",
    membership.deleted_at,
    null,
  );
}
