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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_creation_as_subtask_and_nesting_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Step A: Create parent task (top-level, no parent)
  const parentTask =
    await api.functional.hrmTimeTracking.member.projects.tasks.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          title: "Design system architecture",
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(parentTask);
  TestValidator.equals("parent task status", parentTask.status, "open");
  TestValidator.equals("parent task has no parent", parentTask.parent, null);
  TestValidator.equals("parent task has no subtasks", parentTask.subtasks, []);
  // Step B: Create subtask referencing parent
  const subtaskTitle = "Implement API gateway";
  const subtaskDescription =
    "Build the API gateway as part of system architecture";
  const subtask =
    await api.functional.hrmTimeTracking.member.projects.tasks.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          title: subtaskTitle,
          description: subtaskDescription,
          priority: "urgent",
          parent_task_id: parentTask.id,
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(subtask);
  TestValidator.equals("subtask title matches", subtask.title, subtaskTitle);
  TestValidator.equals(
    "subtask description matches",
    subtask.description,
    subtaskDescription,
  );
  TestValidator.equals("subtask status is open", subtask.status, "open");
  TestValidator.equals(
    "subtask priority is urgent",
    subtask.priority,
    "urgent",
  );
  TestValidator.equals(
    "subtask parent id matches",
    subtask.parent!.id,
    parentTask.id,
  );
  TestValidator.equals("subtask has no subtasks", subtask.subtasks, []);
  TestValidator.equals(
    "subtask taskHistories count",
    subtask.taskHistories.length,
    1,
  );
  TestValidator.equals(
    "subtask initial history new_status",
    subtask.taskHistories[0]!.new_status,
    "open",
  );
  // Step C: Verify nesting constraint (a subtask cannot itself be a parent)
  await TestValidator.httpError(
    "subtask cannot have child tasks — single-level nesting enforced",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.create(
        memberConnection,
        {
          projectId: project.id,
          body: {
            title: "Nested deeper",
            parent_task_id: subtask.id,
          } satisfies IHrmTimeTrackingTask.ICreate,
        },
      );
    },
  );
}
