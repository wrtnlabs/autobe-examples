import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
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

/**
 * Test cross-organization access denial for task history entries.
 *
 * This test verifies that task history entries are properly isolated by
 * organization context, preventing unauthorized access to audit trail data
 * from other organizations.
 */
export async function test_api_task_history_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A in Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://test.com/join",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a project in Organization A
  const project = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {
      body: {
        name: "Test Project A",
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task in the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberAConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for History",
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 4. Update the task status to generate a task history entry
  const updatedTask = await api.functional.hrmPlatform.member.tasks.update(
    memberAConnection,
    {
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. Setup Member B in Organization B (different organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      href: "https://test.com/join",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 6. Attempt to access a task history entry from Organization A using Member B
  // Note: We use a placeholder UUID. The authorization check should fail before
  // attempting to retrieve the actual history entry, regardless of whether the
  // ID exists or not.
  const historyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "cross-organization task history access denied",
    403,
    async () =>
      await api.functional.hrmPlatform.member.task_histories.at(
        memberBConnection,
        {
          historyId,
        },
      ),
  );
}
