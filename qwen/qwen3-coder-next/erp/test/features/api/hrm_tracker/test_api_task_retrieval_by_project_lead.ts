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

export async function test_api_task_retrieval_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      display_name: "Admin User",
    } satisfies IHrmTrackerMember.IJoin,
  });
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      adminConnection,
      {
        body: {
          name: "Test Organization",
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Create project
  const project = await generate_random_hrm_tracker_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project",
        color: "#FF5733",
      } satisfies IHrmTrackerProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create employee (need to use actual employee creation if available)
  // Since there's no direct employee creation API, we'll join as member first
  const leadConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(leadConnection, {
    body: {
      email: "lead@test.com",
      password: "12345678",
      display_name: "Project Lead",
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // 4. Assign member as project-lead
  const projectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      leadConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_tracker_employee_id: member.id, // Use member ID as employee ID
          role: "project-lead",
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 5. Create task by project lead
  const task = await generate_random_hrm_tracker_member_projects_tasks_create(
    leadConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task",
        status: "open",
        priority: "medium",
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // 6. Retrieve task by project lead and validate
  const retrievedTask =
    await api.functional.hrmTracker.member.projects.tasks.at(leadConnection, {
      projectId: project.id,
      taskId: task.id,
    });
  typia.assert(retrievedTask);
  // 7. Validate task details
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "assigned employee matches",
    retrievedTask.assigned_employee,
    null,
  );
}
