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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * 1. First member registers and authenticates (creates default org A)
   */
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(firstMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: "First Member Test",
      },
    });
  typia.assert(firstMember);
  /**
   * 2. Create project in first member's organization
   */
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      firstMemberConnection,
      {},
    );
  typia.assert(project);
  /**
   * 3. Create task in the project
   */
  const task: IHrmPlatformTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      firstMemberConnection,
      {
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  /**
   * 4. Second member registers and authenticates (creates different default org B)
   */
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(secondMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: "Second Member Test",
      },
    });
  typia.assert(secondMember);
  /**
   * 5. Second member attempts to retrieve task from organization A
   * Should fail with 404 Not Found because task belongs to different organization
   */
  await TestValidator.httpError(
    "task not found when accessed from different organization",
    404,
    async () => {
      await api.functional.hrmPlatform.member.tasks.at(secondMemberConnection, {
        taskId: task.id,
      });
    },
  );
}
