import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
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
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_history_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member 1 creates organization context by joining
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member1);
  // 2. Member 1 creates a project
  const project = await api.functional.hrmTracker.member.projects.create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#" + RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
        >() satisfies number as number,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Member 2 joins and authenticates
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member2);
  // 4. Member 2 is assigned as project member (not project-lead)
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      member1Connection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: member2.id,
          role: "member" satisfies IHrmTrackerProjectMember.ICreate["role"] as IHrmTrackerProjectMember.ICreate["role"],
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Member 2 creates a task in the project
  const task = await api.functional.hrmTracker.member.projects.tasks.create(
    member2Connection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status:
          "open" satisfies IHrmTrackerTask.ICreate["status"] as IHrmTrackerTask.ICreate["status"],
        priority:
          "medium" satisfies IHrmTrackerTask.ICreate["priority"] as IHrmTrackerTask.ICreate["priority"],
        estimated_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >() satisfies number as number,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // 6. Member 2 updates task status to create history record
  const updatedTask =
    await api.functional.hrmTracker.member.projects.tasks.taskHistories.update(
      member2Connection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status:
            "in-progress" satisfies IHrmTrackerTask.IUpdate["status"] as IHrmTrackerTask.IUpdate["status"],
        } satisfies IHrmTrackerTask.IUpdate,
      },
    );
  typia.assert(updatedTask);
  // 7. Retrieve task history records for the task
  const taskHistories =
    await api.functional.hrmTracker.member.projects.tasks.taskHistories.at(
      member2Connection,
      {
        projectId: project.id,
        taskId: task.id,
        taskHistoryId: updatedTask.id,
      },
    );
  typia.assert(taskHistories);
  // 8. Validate the history record
  TestValidator.equals("task matches", taskHistories.task.id, task.id);
  TestValidator.equals(
    "new status is in-progress",
    taskHistories.new_status,
    "in-progress",
  );
  TestValidator.equals("old status is open", taskHistories.old_status, "open");
  TestValidator.equals(
    "employee is member2",
    taskHistories.employee.id,
    member2.id,
  );
  TestValidator.equals(
    "organization matches",
    taskHistories.organization.id,
    project.organization.id,
  );
}
