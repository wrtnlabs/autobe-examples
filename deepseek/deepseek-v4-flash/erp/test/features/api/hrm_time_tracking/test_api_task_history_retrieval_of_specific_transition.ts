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
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_history_retrieval_of_specific_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const employeeId = authorized.employees[0].id;
  // 2. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 3. Add the authenticated employee as a project-lead
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 4. Create a task
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 5. Change task status from 'open' to 'in-progress' — creates history entry #1
  const taskAfterFirstUpdate =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "in-progress" },
      },
    );
  typia.assert(taskAfterFirstUpdate);
  // 6. Change task status from 'in-progress' to 'completed' — creates history entry #2
  const taskAfterSecondUpdate =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "completed" },
      },
    );
  typia.assert(taskAfterSecondUpdate);
  // taskHistories: [0]=open(initial), [1]=in-progress, [2]=completed
  const history2 = taskAfterSecondUpdate.taskHistories[2];
  // 7. Retrieve history entry #2 via the dedicated GET endpoint
  const retrievedHistory =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        historyId: history2.id,
      },
    );
  typia.assert(retrievedHistory);
  // Validate the retrieved history entry
  TestValidator.equals(
    "previous_status is 'in-progress'",
    retrievedHistory.previous_status,
    "in-progress",
  );
  TestValidator.equals(
    "new_status is 'completed'",
    retrievedHistory.new_status,
    "completed",
  );
  TestValidator.equals(
    "task reference matches",
    retrievedHistory.task.id,
    task.id,
  );
  TestValidator.notEquals(
    "is history #2, not history #1",
    retrievedHistory.id,
    taskAfterFirstUpdate.taskHistories[1].id,
  );
  TestValidator.equals(
    "both histories reference same task",
    taskAfterFirstUpdate.taskHistories[1].task.id,
    task.id,
  );
}
