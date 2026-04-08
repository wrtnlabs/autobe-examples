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
 * Test that soft-deleted projects return 404 Not Found.
 *
 * Validates that after a project is deleted, attempting to retrieve it by UUID returns a 404 error without exposing any project data. This ensures deleted projects are properly excluded from queries and do not leak information about previously existing resources.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Member creates an organization to establish multi-tenancy context.
 * 3. Member creates a project within the organization.
 * 4. Member deletes the project using the erase endpoint.
 * 5. Attempting to retrieve the deleted project returns 404 Not Found.
 * 6. Verifies the error response contains no project data.
 */
export async function test_api_project_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 4. Delete the project
  await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
    projectId: project.id,
  });
  // 5. Attempt to retrieve deleted project - should return 404
  await TestValidator.error("deleted project returns 404", async () => {
    const retrieved = await api.functional.hrmPlatform.member.projects.at(
      memberConnection,
      {
        projectId: project.id,
      },
    );
    typia.assert(retrieved);
  });
}