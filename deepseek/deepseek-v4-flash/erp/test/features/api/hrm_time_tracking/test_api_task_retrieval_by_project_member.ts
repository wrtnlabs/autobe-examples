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

export async function test_api_task_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Register a new member
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const href: string = typia.random<string & tags.Format<"uri">>();
  const referrer: string = typia.random<string & tags.Format<"uri">>();
  const joinResult: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
        display_name: RandomGenerator.name(),
        href,
        referrer,
      },
    });
  typia.assert(joinResult);
  // 2. Create an organization — the member automatically becomes an Owner employee
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get the updated profile with employee records
  const loginResult: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(memberConnection, {
      body: {
        email,
        password,
        href,
        referrer,
      },
    });
  typia.assert(loginResult);
  // 4. Extract the employee ID (the member is now an Owner employee of the org)
  const employeeId: string = loginResult.employees[0].id;
  // 5. Create a project within the organization
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 6. Add the employee as a project member with 'member' role
  const projectMember: IHrmTimeTrackingProjectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 7. Create a task within the project with specific values
  const taskTitle: string = RandomGenerator.paragraph({ sentences: 2 });
  const taskDescription: string = RandomGenerator.content({ paragraphs: 1 });
  const taskPriority: string = "high";
  const taskEstimatedHours: number = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
  >() satisfies number as number;
  const task: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        body: {
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
          estimated_hours: taskEstimatedHours,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 8. Retrieve the task by its ID from the project
  const retrievedTask: IHrmTimeTrackingTask =
    await api.functional.hrmTimeTracking.member.projects.tasks.at(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(retrievedTask);
  // 9. Validate the retrieved task fields
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, taskTitle);
  TestValidator.equals("task status is open", retrievedTask.status, "open");
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    taskPriority,
  );
  TestValidator.equals(
    "task estimatedHours matches",
    retrievedTask.estimatedHours,
    taskEstimatedHours,
  );
  TestValidator.equals(
    "project id matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.predicate(
    "assignedEmployee is null",
    retrievedTask.assignedEmployee === null,
  );
  TestValidator.predicate(
    "parent is null (top-level task)",
    retrievedTask.parent === null,
  );
  TestValidator.predicate(
    "subtasks is empty array",
    Array.isArray(retrievedTask.subtasks) &&
      retrievedTask.subtasks.length === 0,
  );
  TestValidator.predicate(
    "taskHistories has at least one entry",
    Array.isArray(retrievedTask.taskHistories) &&
      retrievedTask.taskHistories.length >= 1,
  );
  TestValidator.predicate(
    "taskHistories first entry records 'open' status",
    retrievedTask.taskHistories[0].new_status === "open",
  );
  TestValidator.predicate(
    "createdAt is present and valid",
    typeof retrievedTask.createdAt === "string" &&
      retrievedTask.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is present and valid",
    typeof retrievedTask.updatedAt === "string" &&
      retrievedTask.updatedAt.length > 0,
  );
}
