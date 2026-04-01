import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function test_api_project_creation_with_required_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project with only required fields (name, color_code, status)
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const projectColorCode = "#3B82F6";
  const projectStatus = "active";
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: projectName,
        color_code: projectColorCode,
        status: projectStatus,
        // Optional fields intentionally omitted to test required fields only
      },
    },
  );
  typia.assert(project);
  // 3. Verify the response contains all required fields with correct values
  TestValidator.equals("project name matches input", project.name, projectName);
  TestValidator.equals(
    "color code matches input",
    project.color_code,
    projectColorCode,
  );
  TestValidator.equals("status is active", project.status, projectStatus);
  // 4. Verify organization context is present
  TestValidator.predicate(
    "organization has id",
    () => project.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization has name",
    () => project.organization.name !== undefined,
  );
  // 5. Verify system-generated timestamps have valid relationship
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    () => new Date(project.created_at) <= new Date(project.updated_at),
  );
}
