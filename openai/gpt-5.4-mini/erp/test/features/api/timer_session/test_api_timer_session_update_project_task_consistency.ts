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
import type { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
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
import { generate_random_hrm_time_tracking_member_timer_sessions_create } from "../../../generate/generate_random_hrm_time_tracking_member_timer_sessions_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timer_session } from "../../../prepare/prepare_random_hrm_time_tracking_timer_session";

export async function test_api_timer_session_update_project_task_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const projectOne =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Primary ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#ff5500",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectOne);
  const projectTwo =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `Secondary ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: "#0055ff",
          status: "active",
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(projectTwo);
  const taskOne =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectOne.id },
        body: {
          title: `Task ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          status: "open",
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskOne);
  const taskTwo =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectTwo.id },
        body: {
          title: `Task ${RandomGenerator.name()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          priority: "medium",
          status: "open",
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(taskTwo);
  const timerSession =
    await generate_random_hrm_time_tracking_member_timer_sessions_create(
      memberConnection,
      {
        body: {
          project_id: projectOne.id,
          task_id: taskOne.id,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(timerSession);
  const updatedSession =
    await api.functional.hrmTimeTracking.member.timer_sessions.update(
      memberConnection,
      {
        timerSessionId: timerSession.id,
        body: {
          hrm_time_tracking_project_id: projectTwo.id,
          hrm_time_tracking_task_id: taskTwo.id,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IHrmTimeTrackingTimerSession.IUpdate,
      },
    );
  typia.assert(updatedSession);
  TestValidator.equals(
    "updated session should switch to the second project",
    updatedSession.project.id,
    projectTwo.id,
  );
  TestValidator.equals(
    "updated session should keep the task paired with the new project",
    updatedSession.task?.id,
    taskTwo.id,
  );
  TestValidator.equals(
    "updated session should remain owned by the same member",
    updatedSession.employee.id,
    timerSession.employee.id,
  );
  TestValidator.equals(
    "running timer should remain active after editing",
    updatedSession.ended_at,
    null,
  );
  TestValidator.equals(
    "running timer should not be discarded after editing",
    updatedSession.discarded_at,
    null,
  );
  await TestValidator.httpError(
    "mismatched task should not be accepted when moving timer to a new project",
    [400, 409, 422],
    async () => {
      await api.functional.hrmTimeTracking.member.timer_sessions.update(
        memberConnection,
        {
          timerSessionId: timerSession.id,
          body: {
            hrm_time_tracking_project_id: projectTwo.id,
            hrm_time_tracking_task_id: taskOne.id,
          } satisfies IHrmTimeTrackingTimerSession.IUpdate,
        },
      );
    },
  );
}
