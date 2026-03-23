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
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_retrieval_by_member_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await api.functional.hrmTracker.member.organizations.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create project in organization
  const project = await api.functional.hrmTracker.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create assignee member
  const assigneeConnection: api.IConnection = { host: connection.host };
  const assignee = await authorize_member_join(assigneeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(assignee);
  // 5. Create project member assignment for assignee
  const projectMember =
    await api.functional.hrmTracker.member.projects.projectMembers.create(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_tracker_employee_id: assignee.id,
          role: "member" as const,
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 6. Create task with assignee
  const task = await api.functional.hrmTracker.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open" as const,
        priority: "medium" as const,
        assigned_employee_id: assignee.id,
        due_date: new Date().toISOString(),
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // 7. Member retrieves task
  const retrievedTask =
    await api.functional.hrmTracker.member.projects.tasks.at(memberConnection, {
      projectId: project.id,
      taskId: task.id,
    });
  typia.assert(retrievedTask);
  // 8. Validate
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    task.priority,
  );
  if (retrievedTask.assigned_employee !== null) {
    TestValidator.equals(
      "assigned employee matches",
      retrievedTask.assigned_employee.id,
      assignee.id,
    );
  } else {
    throw new Error("Task should have an assigned employee");
  }
  TestValidator.equals(
    "project summary exists",
    typeof retrievedTask.project,
    "object",
  );
  TestValidator.equals(
    "organization summary exists",
    typeof retrievedTask.project.organization,
    "object",
  );
}
