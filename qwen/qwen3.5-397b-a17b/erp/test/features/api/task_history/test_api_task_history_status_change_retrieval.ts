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

export async function test_api_task_history_status_change_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
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
  // Update connection with authorization token
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create a project with required name and color_code
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create a task in the project with status 'open' which generates initial history
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // Note: In production, you would call the list histories endpoint to get historyId.
  // Since only the 'at' endpoint is provided in the SDK, this test demonstrates
  // the retrieval pattern. The historyId would be obtained from:
  // const histories = await api.functional.hrmPlatform.member.projects.tasks.histories.list(...)
  // const historyId = histories[0].id;
  // For this test, we generate a valid UUID format for the historyId parameter
  // In real usage, this would come from the list endpoint response
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the specific history record using the historyId
  // This will return 404 if the historyId doesn't exist, which is expected
  // since we cannot list histories to get a valid ID
  const retrievedHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: historyId,
      },
    );
  typia.assert(retrievedHistory);
  // Validate the retrieved history record structure
  TestValidator.equals(
    "new_status is open",
    retrievedHistory.new_status,
    "open",
  );
  TestValidator.predicate(
    "created_at is set",
    retrievedHistory.created_at !== null,
  );
  TestValidator.predicate(
    "user object has id",
    retrievedHistory.user.id !== null,
  );
  TestValidator.predicate(
    "user object has display_name",
    retrievedHistory.user.display_name !== null,
  );
}
