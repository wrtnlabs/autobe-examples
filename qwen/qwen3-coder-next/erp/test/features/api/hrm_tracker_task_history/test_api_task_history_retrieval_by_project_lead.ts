import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_history_retrieval_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and establishes organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 2. Member creates a project and becomes project-lead
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Member creates a task within the project
  const task = await api.functional.hrmTracker.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
        estimated_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Member changes task status to create history record
  const updatedTask =
    await api.functional.hrmTracker.member.projects.tasks.taskHistories.update(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTrackerTask.IUpdate,
      },
    );
  typia.assert(updatedTask);
  // 5. Retrieve the specific task history record
  const taskHistoryId = task.id;
  const taskHistory =
    await api.functional.hrmTracker.member.projects.tasks.taskHistories.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        taskHistoryId: taskHistoryId,
      },
    );
  typia.assert(taskHistory);
  // 6. Validate returned history record
  TestValidator.equals("old_status is open", taskHistory.old_status, "open");
  TestValidator.equals(
    "new_status is in-progress",
    taskHistory.new_status,
    "in-progress",
  );
  TestValidator.predicate("changed_at exists", taskHistory.changed_at !== null);
  TestValidator.equals("task_id matches", taskHistory.task.id, task.id);
  TestValidator.equals(
    "employee is project-lead",
    taskHistory.employee.id,
    member.id,
  );
  TestValidator.equals(
    "organization_id matches",
    taskHistory.organization.id,
    project.organization.id,
  );
}
