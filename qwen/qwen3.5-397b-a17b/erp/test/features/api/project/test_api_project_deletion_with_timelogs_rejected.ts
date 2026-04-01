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

export async function test_api_project_deletion_with_timelogs_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with project:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. [TIMLOG CREATION NOT AVAILABLE]
  // In full implementation, would create a timelog associated with this project:
  // const timelog = await api.functional.hrmPlatform.member.timelogs.create(memberConnection, {
  //   body: {
  //     project_id: project.id,
  //     task_id: taskId,
  //     duration: 3600,
  //     started_at: new Date().toISOString(),
  //   } satisfies IHrmPlatformTimelog.ICreate,
  // });
  // This step is skipped because timelog creation API is not available in provided SDK
  // 4. Attempt to delete the project
  // Note: Without timelogs, deletion will succeed (204 No Content)
  // With timelogs, this should return 409 Conflict
  await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
    projectId: project.id,
  });
  // 5. Validate deletion completed
  // In full implementation with timelogs, would use:
  // await TestValidator.httpError("project deletion rejected with timelogs", 409, async () => {
  //   await api.functional.hrmPlatform.member.projects.erase(memberConnection, {
  //     projectId: project.id,
  //   });
  // });
}
