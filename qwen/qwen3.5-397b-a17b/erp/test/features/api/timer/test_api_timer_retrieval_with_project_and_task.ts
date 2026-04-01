import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_retrieval_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection and create organization
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
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
  // 3. Select the organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  // 4. Create a project within the organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create a task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(task);
  // 6. Start a timer for the task with a description
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  // 7. Retrieve the timer using its UUID
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 8. Validate timer response structure and data integrity
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  TestValidator.equals(
    "employee user ID matches member ID",
    retrievedTimer.employee.user.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.equals("task ID matches", retrievedTimer.task?.id, task.id);
  TestValidator.predicate(
    "task is populated (not null)",
    retrievedTimer.task !== null,
  );
  TestValidator.equals(
    "task title matches",
    retrievedTimer.task?.title,
    task.title,
  );
  TestValidator.equals(
    "task status matches",
    retrievedTimer.task?.status,
    task.status,
  );
  TestValidator.equals(
    "project name matches",
    retrievedTimer.project.name,
    project.name,
  );
  TestValidator.equals(
    "project status matches",
    retrievedTimer.project.status,
    project.status,
  );
  TestValidator.predicate(
    "started_at is valid date-time",
    retrievedTimer.started_at !== null,
  );
  TestValidator.predicate(
    "description is populated",
    retrievedTimer.description !== null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedTimer.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedTimer.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null (active timer)",
    retrievedTimer.deleted_at === null,
  );
  TestValidator.equals(
    "employee user display_name matches",
    retrievedTimer.employee.user.display_name,
    memberAuth.display_name,
  );
  TestValidator.predicate(
    "employee role exists",
    retrievedTimer.employee.role.name !== null,
  );
}
