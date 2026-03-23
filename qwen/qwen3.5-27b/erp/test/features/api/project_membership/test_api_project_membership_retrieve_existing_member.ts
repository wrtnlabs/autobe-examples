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
 * Test retrieving an existing project membership record for an employee with 'member' role.
 * Validates complete membership information including nested employee and project details.
 */
export async function test_api_project_membership_retrieve_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // 2. Create a project in the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10>
        >() satisfies number | null as number | null,
      },
    },
  );
  typia.assert(project);
  // 3. Create a project membership with 'member' role
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: authResult.id,
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // 4. Retrieve the membership using GET endpoint
  const retrievedMembership =
    await api.functional.hrmPlatform.member.projects.memberships.at(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
      },
    );
  typia.assert(retrievedMembership);
  // 5. Validate membership information matches creation
  TestValidator.equals(
    "membership ID matches",
    retrievedMembership.id,
    membership.id,
  );
  TestValidator.equals("role is member", retrievedMembership.role, "member");
  TestValidator.equals(
    "project ID matches",
    retrievedMembership.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedMembership.project.name,
    project.name,
  );
  TestValidator.equals(
    "project status is active",
    retrievedMembership.project.status,
    "active",
  );
  // 6. Validate nested employee details are present
  TestValidator.equals(
    "employee ID matches",
    retrievedMembership.employee.id,
    membership.employee.id,
  );
  TestValidator.equals(
    "member email present",
    retrievedMembership.employee.member.email,
    authResult.email,
  );
  TestValidator.predicate(
    "employee has status",
    retrievedMembership.employee.status !== undefined,
  );
  TestValidator.predicate(
    "employee has employment type",
    retrievedMembership.employee.employment_type !== undefined,
  );
  // 7. Validate membership is active (not soft-deleted)
  TestValidator.equals(
    "membership is active",
    retrievedMembership.deleted_at,
    null,
  );
  // 8. Validate timestamps exist
  TestValidator.predicate(
    "membership has created_at timestamp",
    retrievedMembership.created_at !== undefined,
  );
  TestValidator.predicate(
    "membership has updated_at timestamp",
    retrievedMembership.updated_at !== undefined,
  );
}
