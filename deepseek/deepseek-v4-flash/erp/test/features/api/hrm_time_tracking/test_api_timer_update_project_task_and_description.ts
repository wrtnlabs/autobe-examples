import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { generate_random_hrm_time_tracking_member_timers_start } from "../../../generate/generate_random_hrm_time_tracking_member_timers_start";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_timer } from "../../../prepare/prepare_random_hrm_time_tracking_timer";

export async function test_api_timer_update_project_task_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  const employeeId: string = memberAuth.employees[0].id;
  // 2. Create Project A
  const projectA =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectA);
  // 3. Add self as member of Project A
  const projectAMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          employee_id: employeeId,
          role: "member",
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
      },
    );
  typia.assert(projectAMember);
  // 4. Start a running timer on Project A
  const timer = await generate_random_hrm_time_tracking_member_timers_start(
    memberConnection,
    {
      body: {
        projectId: projectA.id,
      } satisfies IHrmTimeTrackingTimer.ICreate,
    },
  );
  typia.assert(timer);
  const originalStartedAt: string = timer.started_at;
  const originalUpdatedAt: string = timer.updated_at;
  // 5. Create Project B
  const projectB =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(projectB);
  // 6. Add self as member of Project B
  const projectBMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          employee_id: employeeId,
          role: "member",
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
      },
    );
  typia.assert(projectBMember);
  // 7. Create a task in Project B
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(task);
  // 8. Update the timer to switch to Project B with task and new description
  const newDescription: string = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTimer =
    await api.functional.hrmTimeTracking.member.timers.update(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          projectId: projectB.id,
          taskId: task.id,
          description: newDescription,
        } satisfies IHrmTimeTrackingTimer.IUpdate,
      },
    );
  typia.assert(updatedTimer);
  // 9. Validate the update
  TestValidator.equals("project switched to Project B", updatedTimer.project.id, projectB.id);
  TestValidator.equals("task assigned to the created task", updatedTimer.task?.id, task.id);
  TestValidator.equals("description updated to new value", updatedTimer.description, newDescription);
  TestValidator.equals("timer status remains running", updatedTimer.status, "running");
  TestValidator.equals("started_at remains unchanged", updatedTimer.started_at, originalStartedAt);
  TestValidator.predicate("updated_at is refreshed", () => {
    return (
      new Date(updatedTimer.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime()
    );
  });
}