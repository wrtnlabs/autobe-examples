import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that project deletion is blocked when the project has recorded timelogs.
 *
 * Validates the business rule that prevents project deletion when timelogs exist, ensuring data integrity for time tracking records. The test creates a member account, establishes a project, records time against it, and verifies that deletion attempts are rejected with appropriate error messaging.
 *
 * This blocking condition protects against accidental data loss and ensures that organizations must explicitly handle timelog data (either by deletion or reassignment) before removing projects from the system.
 *
 * 1. Member registers and authenticates via join endpoint to obtain authenticated connection.
 * 2. Member creates a new project with randomized name, color, and optional details.
 * 3. Member creates a timelog entry referencing the created project's ID.
 * 4. Member attempts to delete the project that has associated timelogs.
 * 5. Expected: API returns 400 Bad Request error indicating project has recorded timelogs.
 * 6. The project and all its data remain intact after the failed deletion attempt.
 */
export async function test_api_project_deletion_blocked_by_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
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
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {});
  typia.assert(project);
  // 3. Create a timelog entry for the project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
      } satisfies DeepPartial<IHrmPlatformTimelog.ICreate>,
    },
  );
  typia.assert(timelog);
  // 4. Attempt to delete the project (should fail with 400 error)
  await TestValidator.error(
    "project deletion blocked by timelogs",
    async () => {
      await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
        projectId: project.id,
      });
    },
  );
}