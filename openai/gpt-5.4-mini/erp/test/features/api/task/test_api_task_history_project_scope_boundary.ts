import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";

export async function test_api_task_history_project_scope_boundary(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = {
    Authorization: member.token.access,
  };
  const primaryProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      projectConnection,
      {
        body: {
          name: RandomGenerator.name(),
          colorCode: "#111111",
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budgetHours: 40,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(primaryProject);
  const secondaryProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      projectConnection,
      {
        body: {
          name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
          colorCode: "#222222",
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budgetHours: 80,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(secondaryProject);
  const unrelatedTaskId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "task history lookup must reject task IDs that do not belong to the specified project",
    [404],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.task_histories.index(
        projectConnection,
        {
          projectId: primaryProject.id,
          taskId: unrelatedTaskId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingTaskHistory.IRequest,
        },
      );
    },
  );
  await TestValidator.httpError(
    "task history lookup must also reject the same unrelated task ID under a different project boundary",
    [404],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.task_histories.index(
        projectConnection,
        {
          projectId: secondaryProject.id,
          taskId: unrelatedTaskId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IHrmTimeTrackingTaskHistory.IRequest,
        },
      );
    },
  );
}
