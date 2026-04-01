import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

/**
 * Test retrieving a project membership record where the employee has standard member role.
 *
 * Workflow:
 * 1. Register and authenticate as a member
 * 2. Create an organization context (member becomes employee automatically)
 * 3. Select the organization as active context
 * 4. Create a project within the organization
 * 5. Assign the member (as employee) to the project with 'member' role
 * 6. Retrieve the membership record and validate response structure
 */
export async function test_api_project_member_retrieve_standard_member_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Set authorization header from auth result
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 2. Create organization (member becomes employee with Owner role automatically)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Select organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals(
    "selected organization matches",
    selectedOrg.id,
    organization.id,
  );
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 5. Assign member to project with 'member' role
  // The prepare function handles generating valid employee ID from the organization
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "member",
        },
      },
    );
  typia.assert(membership);
  // 6. Retrieve the membership record
  const retrievedMembership =
    await api.functional.hrmPlatform.member.projects.members.at(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
      },
    );
  typia.assert(retrievedMembership);
  // Validate business logic (not type structure - typia.assert handles that)
  TestValidator.equals(
    "membership id matches",
    retrievedMembership.id,
    membership.id,
  );
  TestValidator.equals("role is member", retrievedMembership.role, "member");
  TestValidator.equals(
    "project id matches",
    retrievedMembership.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedMembership.project.name,
    project.name,
  );
  TestValidator.predicate(
    "membership is active (not soft-deleted)",
    retrievedMembership.deleted_at === null,
  );
}
