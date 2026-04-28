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
 * Test project archive conflict when attempting to archive an already archived project.
 *
 * Validates that the system prevents redundant archival operations by rejecting attempts
 * to archive projects that are already in archived status. The test authenticates
 * as a member, creates an active project, successfully archives it, then attempts to
 * archive it again, verifying that a 409 Conflict response is returned.
 *
 * 1. Authenticate as a member to gain access to project operations.
 * 2. Create a new active project with random data.
 * 3. Successfully archive the project.
 * 4. Attempt to archive the same project again.
 * 5. Verify that the second archive request fails with a 409 Conflict response.
 */
export async function test_api_project_archive_conflict_already_archived(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new active project
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 3. Successfully archive the project
  const archivedProject: IHrmPlatformProject =
    await api.functional.hrmPlatform.member.projects.archive(memberConnection, {
      projectId: project.id,
    });
  typia.assert(archivedProject);
  // 4. Verify the project is now archived
  TestValidator.equals(
    "project status is archived after first archive",
    archivedProject.status,
    "archived",
  );
  // 5. Attempt to archive the same project again
  // This should fail with a 409 Conflict response
  await TestValidator.error(
    "archiving already archived project fails with 409 Conflict",
    async () => {
      await api.functional.hrmPlatform.member.projects.archive(
        memberConnection,
        {
          projectId: project.id,
        },
      );
    },
  );
}
