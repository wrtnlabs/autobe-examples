import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test organization isolation for project retrieval in multi-tenant HRM platform.
 *
 * This test validates that members cannot access projects from organizations
 * they don't belong to, ensuring proper multi-tenancy data isolation.
 *
 * 1. Create and authenticate member A (organization A)
 * 2. Create a project in organization A
 * 3. Create and authenticate member B (organization B)
 * 4. Attempt to retrieve organization A's project using member B's credentials
 * 5. Verify the request fails with 403 Forbidden or 404 Not Found
 */
export async function test_api_project_retrieval_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member A (organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a project in organization A using member A's authenticated connection
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(projectA);
  // 3. Create and authenticate member B (organization B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // Verify members have different IDs (different accounts)
  TestValidator.notEquals("different member accounts", memberA.id, memberB.id);
  // 4. Attempt to retrieve organization A's project using member B's credentials
  // This should fail because member B belongs to a different organization
  await TestValidator.httpError(
    "cross-organization project access denied",
    [403, 404],
    async () =>
      await api.functional.hrmPlatform.member.projects.at(memberBConnection, {
        projectId: projectA.id,
      }),
  );
  // 5. Verify member A can still access their own project (positive control)
  const projectAVerified = await api.functional.hrmPlatform.member.projects.at(
    memberAConnection,
    {
      projectId: projectA.id,
    },
  );
  typia.assert(projectAVerified);
  TestValidator.equals(
    "member A can access own project",
    projectAVerified.id,
    projectA.id,
  );
}
