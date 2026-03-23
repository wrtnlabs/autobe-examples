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
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_task_timeline_access_for_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Create project first - we need a valid project to assign project members
  const project = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    color: "#3498db",
    status: "active",
    start_date: new Date().toISOString(),
    end_date: null,
    organization: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Test Organization",
      description: null,
      logo_image_uri: null,
      status: "active" as const,
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  } satisfies IHrmTrackerProject.ISummary;
  // Create employee first (required for project member assignment)
  const employee = {
    id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
    position: "Developer",
    created_at: new Date().toISOString(),
    user: {
      id: member.id,
      display_name: member.display_name,
      avatar_url: null,
      phone: member.phone,
      status: member.status,
      email_verified: member.email_verified,
    } satisfies IHrmTrackerMember.ISummary,
  } satisfies IHrmTrackerEmployee.ISummary;
  // Assign member as project-lead
  const projectMember =
    await generate_random_hrm_tracker_member_projects_project_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "project-lead" as const,
          hrm_tracker_employee_id: employee.id,
        } satisfies IHrmTrackerProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // Create root task
  const task = await generate_random_hrm_tracker_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open" as const,
        priority: "high" as const,
        assigned_employee_id: employee.id,
      } satisfies IHrmTrackerTask.ICreate,
    },
  );
  typia.assert(task);
  // Create subtask
  const subtask =
    await generate_random_hrm_tracker_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open" as const,
          priority: "medium" as const,
          assigned_employee_id: employee.id,
          parent_task_id: task.id,
        } satisfies IHrmTrackerTask.ICreate,
      },
    );
  typia.assert(subtask);
  // Retrieve timeline as project-lead
  const timeline =
    await api.functional.hrmTracker.member.projects.tasks.timeline.at(
      memberConnection,
      {
        projectId: project.id,
      },
    );
  typia.assert(timeline);
  // Validate timeline structure
  TestValidator.equals("task title matches", timeline.title, task.title);
  TestValidator.predicate(
    "has project context",
    timeline.project.id.length > 0,
  );
  TestValidator.predicate(
    "has organization context",
    timeline.project.organization.id.length > 0,
  );
}
