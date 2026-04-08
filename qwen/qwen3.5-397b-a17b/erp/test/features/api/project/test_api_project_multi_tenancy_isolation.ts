import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test multi-tenancy enforcement by verifying a member cannot access a project belonging to a different organization.
 *
 * Validates that organization isolation prevents cross-organization data access and does not leak information about projects in other organizations. The test creates two separate members, each with their own organization, and verifies that a member from Organization B cannot access a project from Organization A even when knowing the project's UUID.
 *
 * 1. Member A registers and authenticates with unique credentials.
 * 2. Member A creates Organization A with random configuration.
 * 3. Member A creates a project within Organization A.
 * 4. Member B registers and authenticates with separate credentials.
 * 5. Member B creates Organization B with different configuration.
 * 6. Member B attempts to retrieve Member A's project using its UUID.
 * 7. Validates that the system returns 404 Not Found without revealing the project's existence.
 *
 * This test ensures that the multi-tenancy boundary is properly enforced at the API level, preventing data leakage across organizational boundaries even when resource identifiers are known.
 */
export async function test_api_project_multi_tenancy_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registration and authentication
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  memberAConnection.headers = {
    Authorization: `Bearer ${memberA.token.access}`,
  };
  // 2. Member A creates Organization A
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(orgA);
  // 3. Member A creates a project in Organization A
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(projectA);
  // 4. Member B registration and authentication (separate tenant)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  memberBConnection.headers = {
    Authorization: `Bearer ${memberB.token.access}`,
  };
  // 5. Member B creates Organization B
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(orgB);
  // 6. Member B attempts to access Member A's project (should fail with 404)
  await TestValidator.error(
    "cross-organization project access denied",
    async () => {
      await api.functional.hrmPlatform.member.projects.at(memberBConnection, {
        projectId: projectA.id,
      });
    },
  );
  // 7. Verify Member A can still access their own project
  const retrievedProject = await api.functional.hrmPlatform.member.projects.at(
    memberAConnection,
    {
      projectId: projectA.id,
    },
  );
  typia.assert(retrievedProject);
  TestValidator.equals("project id matches", retrievedProject.id, projectA.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    projectA.name,
  );
}
