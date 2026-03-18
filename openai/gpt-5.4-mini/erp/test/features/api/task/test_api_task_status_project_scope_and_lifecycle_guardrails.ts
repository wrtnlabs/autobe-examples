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
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_status_project_scope_and_lifecycle_guardrails(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const projectA = await api.functional.hrmTimeTracking.member.projects.create(
    memberConnection,
    {
      body: {
        name: `${RandomGenerator.name()} A`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(projectA);
  const projectB = await api.functional.hrmTimeTracking.member.projects.create(
    memberConnection,
    {
      body: {
        name: `${RandomGenerator.name()} B`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#ff6633",
        status: "active",
        budgetHours: 120,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(projectB);
  const task =
    await api.functional.hrmTimeTracking.member.projects.tasks.create(
      memberConnection,
      {
        projectId: projectA.id,
        body: {
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "normal",
          estimatedHours: 4,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task);
  TestValidator.equals(
    "task belongs to project A",
    task.project.id,
    projectA.id,
  );
  TestValidator.equals("task starts open", task.status, "open");
  await TestValidator.httpError(
    "reject status update through mismatched project scope",
    [400, 403, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
        memberConnection,
        {
          projectId: projectB.id,
          taskId: task.id,
          body: {
            status: "in-progress",
          } satisfies IHrmTimeTrackingTask.IUpdateStatus,
        },
      );
    },
  );
  await TestValidator.httpError(
    "reject invalid task lifecycle transition",
    [400, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
        memberConnection,
        {
          projectId: projectA.id,
          taskId: task.id,
          body: {
            status: "completed",
          } satisfies IHrmTimeTrackingTask.IUpdateStatus,
        },
      );
    },
  );
}
