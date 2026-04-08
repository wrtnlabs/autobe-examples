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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test successful deletion of a project that has no members assigned and no timelogs recorded.
 *
 * This validates the happy path of project deletion where all blocking conditions are satisfied (empty project with no dependencies). The test creates a fresh project and immediately deletes it to verify the erase endpoint works correctly when no project members or timelogs exist.
 *
 * 1. Member authenticates via join to obtain valid session credentials.
 * 2. Member creates a new project with required name and color fields.
 * 3. Member deletes the project using its ID via the erase endpoint.
 * 4. Validates the deletion completes without error (204 No Content).
 *
 * The test ensures that a freshly created project with no members or timelogs can be successfully deleted, confirming the cascade deletion behavior works correctly when no blocking conditions exist.
 */
export async function test_api_project_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a new project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Delete the project
  await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
    projectId: project.id,
  });
}
