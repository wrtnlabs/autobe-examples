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

/**
 * Test deletion of an archived project with no associated timelogs.
 *
 * Validates that a project can successfully transition from active to archived lifecycle state, and then be permanently deleted when it contains no time tracking records. This ensures the deletion endpoint properly handles archived projects as valid candidates for removal, provided the zero-timelog constraint is satisfied.
 *
 * The test verifies the complete lifecycle: active → archived → deleted, confirming that project status alone does not prevent deletion and that the only blocking factor for removal is the presence of associated timelogs.
 *
 * 1. Register and authenticate a new member account with a default organization.
 * 2. Create a new active project with random name and color code.
 * 3. Archive the project to transition it to the archived lifecycle state.
 * 4. Verify the archived project response contains status "Archived".
 * 5. Permanently delete the archived project, which should succeed with HTTP 204 since no timelogs exist.
 * 6. Confirm the deletion completes without errors.
 */
export async function test_api_project_deletion_after_archival(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com/",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a new active project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  TestValidator.equals("new project is active", project.status, "Active");
  // 3. Archive the project
  const archivedProject =
    await api.functional.hrmPlatform.member.projects.archive(memberConnection, {
      projectId: project.id,
    });
  typia.assert(archivedProject);
  // 4. Verify the project is now archived
  TestValidator.equals(
    "project status changed to archived",
    archivedProject.status,
    "Archived",
  );
  TestValidator.equals("project id unchanged", archivedProject.id, project.id);
  // 5. Delete the archived project (should succeed - no timelogs)
  await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
    projectId: archivedProject.id,
  });
  // 6. Deletion succeeded - no error thrown means HTTP 204 No Content
}
