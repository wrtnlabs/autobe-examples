import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
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

export async function test_api_task_update_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member and get authentication token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberInfo = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(memberInfo);
  // Update connection with authentication token
  memberConnection.headers = {
    Authorization: memberInfo.token.access,
  };
  // 2. Create project
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create employee and assign to project as project-lead
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeInfo = await api.functional.hrmTracker.auth.member.join(
    employeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        phone: null,
      } satisfies IHrmTrackerMember.IJoin,
    },
  );
  typia.assert(employeeInfo);
  // Assign employee to project as project-lead
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: employeeInfo.id,
          role: "project-lead",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 4. Create task
  const task = await api.functional.hrmTracker.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.name(2),
        status: "open",
        priority: "medium",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // 5. Update task as project-lead member
  const updatedTask =
    await api.functional.hrmTracker.member.projects.tasks.update(
      employeeConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          title: RandomGenerator.name(2),
          status: "in-progress",
          priority: "high",
          estimated_hours: typia.random<
            number & tags.Type<"uint32">
          >() satisfies number,
          due_date: new Date().toISOString(),
        } satisfies IHrmTrackerTask.IUpdate,
      },
    );
  typia.assert(updatedTask);
  // 6. Validate update
  TestValidator.equals("title updated", updatedTask.title, task.title);
  TestValidator.equals("status updated", updatedTask.status, "in-progress");
  TestValidator.equals("priority updated", updatedTask.priority, "high");
  TestValidator.predicate(
    "estimated_hours is valid",
    typeof updatedTask.estimated_hours === "number",
  );
  TestValidator.predicate("due_date is valid", updatedTask.due_date !== null);
}
