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
 * Test project creation with required fields only.
 *
 * Validates the complete project creation workflow including member authentication, organization context establishment, and project creation with minimal required data. Ensures that a member can create a project using only the name and color code fields, and that the system correctly populates all auto-generated fields.
 *
 * The test verifies that new projects are created with 'active' status by default, making them immediately available for task assignment and time tracking. Organization context is properly established through the member's session, and the project correctly references the owning organization.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates an organization to establish multi-tenancy context.
 * 3. Member creates a project with only required fields (name and color code).
 * 4. Validates project has 'active' status, correct organization reference, auto-generated UUID, and populated system timestamps (created_at, updated_at).
 */
export async function test_api_project_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization to establish context
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project with required fields only
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const projectColor = typia.random<string>();
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: projectName,
        color: projectColor,
      },
    },
  );
  typia.assert(project);
  // 4. Validate project creation - business logic only (typia.assert handles type validation)
  TestValidator.equals("project name matches input", project.name, projectName);
  TestValidator.equals(
    "project color matches input",
    project.color,
    projectColor,
  );
  TestValidator.equals(
    "organization reference correct",
    project.organization.id,
    organization.id,
  );
  TestValidator.equals("status is active", project.status, "active");
}
