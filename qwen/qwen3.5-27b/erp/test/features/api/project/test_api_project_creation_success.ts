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
 * Test successful project creation with all required fields.
 * 1. Authenticate a member user with project management permissions
 * 2. Create a new project with required fields: name, status, color_code
 * 3. Verify the response returns the created project with all fields
 * 4. Validate timestamps and organization context
 */
export async function test_api_project_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create project with all required fields
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "active",
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        budget_hours:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<10>>() ??
          null,
      },
    },
  );
  typia.assert(project);
  // 3. Validate business logic - project name is not empty
  TestValidator.predicate(
    "project name is not empty",
    () => project.name.length > 0,
  );
  // 4. Validate status is active
  TestValidator.equals("project status is active", project.status, "active");
  // 5. Validate organization context exists
  TestValidator.predicate(
    "organization id exists",
    () => project.organization.id.length > 0,
  );
  TestValidator.predicate(
    "organization name exists",
    () => project.organization.name.length > 0,
  );
  // 6. Validate soft-delete status is null for new project
  TestValidator.equals(
    "deleted_at is null for new project",
    project.deleted_at,
    null,
  );
  // 7. Validate budget_hours if provided
  if (project.budget_hours !== null) {
    const budget = project.budget_hours;
    TestValidator.predicate(
      "budget_hours is positive",
      () => budget > 0,
    );
  }
  // 8. Validate timestamps are valid dates
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(project.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(new Date(project.updated_at).getTime()),
  );
}