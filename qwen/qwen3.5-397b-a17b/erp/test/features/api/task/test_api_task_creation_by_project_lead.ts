import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Create member-specific connection with authentication token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create organization (member becomes owner with full permissions)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create project with active status
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project);
  // 4. Create task with required and optional fields
  // Note: As organization owner, member has project:manage permission
  // and can create tasks without explicit project-lead assignment
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days in the future
  const estimatedHours = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
        description: RandomGenerator.content({ paragraphs: 2 }),
        estimated_hours: estimatedHours,
        due_date: futureDate.toISOString(),
      },
    },
  );
  typia.assert(task);
  // 5. Validate task creation response - required fields
  TestValidator.predicate("task has valid id", task.id !== null);
  TestValidator.predicate("task title exists", task.title.length > 0);
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals("task priority is medium", task.priority, "medium");
  // 6. Validate optional fields are correctly stored
  TestValidator.predicate(
    "task has estimated hours",
    task.estimated_hours !== null,
  );
  TestValidator.equals(
    "estimated hours matches input",
    task.estimated_hours,
    estimatedHours,
  );
  TestValidator.predicate("task has due date", task.due_date !== null);
  // 7. Verify task is associated with correct project
  TestValidator.equals("task project ID matches", task.project.id, project.id);
  TestValidator.equals(
    "task project name matches",
    task.project.name,
    project.name,
  );
  TestValidator.equals(
    "task project status matches",
    task.project.status,
    project.status,
  );
  // 8. Validate timestamps exist
  TestValidator.predicate("task has created_at", task.created_at !== null);
  TestValidator.predicate("task has updated_at", task.updated_at !== null);
  TestValidator.equals("task not deleted", task.deleted_at, null);
  // 9. Validate task relations
  TestValidator.equals(
    "task has no assignee (not assigned)",
    task.assignee,
    null,
  );
  TestValidator.equals(
    "task has no parent (top-level task)",
    task.parentTask,
    null,
  );
  TestValidator.equals(
    "task has no subtasks initially",
    task.subtasks.length,
    0,
  );
  // 10. Validate aggregate counts
  TestValidator.equals("no history yet", task.histories_count, 0);
  TestValidator.equals("no timelogs yet", task.timelogs_count, 0);
  TestValidator.equals("no timers running", task.timers_count, 0);
}
