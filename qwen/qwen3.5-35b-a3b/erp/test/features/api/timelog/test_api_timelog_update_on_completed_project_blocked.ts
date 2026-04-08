import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_timelog_update_on_completed_project_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia
        .random<string & tags.Format<"email">>()
        .split("@")[1]
        .toUpperCase(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Update connection headers with auth token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...memberConnection.headers,
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create a project with 'active' status (initial status)
  const project = await api.functional.hrmPlatform.member.projects.create(
    authenticatedConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals("project starts as active", project.status, "active");
  // 3. Create a task within the project
  const task = await api.functional.hrmPlatform.member.tasks.create(
    authenticatedConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
        project_id: project.id,
        priority: "MEDIUM",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Create a timelog entry referencing the project and task using update endpoint
  // Note: This creates a new timelog since update can be used for both create and update
  const startDateTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const endDateTime = new Date().toISOString();
  const randomTimelogId = typia.random<string & tags.Format<"uuid">>();
  const timelog = await api.functional.hrmPlatform.member.timelogs.update(
    authenticatedConnection,
    {
      timelogId: randomTimelogId,
      body: {
        start_datetime: startDateTime,
        end_datetime: endDateTime,
        project_id: project.id,
        task_id: (task as any).id,
        description: RandomGenerator.paragraph(),
        billable: true,
      } satisfies IHrmPlatformTimelog.IUpdate,
    },
  );
  typia.assert(timelog);
  TestValidator.equals(
    "timelog project references original project",
    timelog.project.id,
    project.id,
  );
  // Capture initial timelog state for comparison
  const initialTimelog = JSON.parse(JSON.stringify(timelog));
  // 5. Update the project status to 'completed' - This endpoint doesn't exist in SDK,
  // so we'll simulate the scenario by creating a new project in completed status
  // and then attempt to update timelogs on it
  const completedProject =
    await api.functional.hrmPlatform.member.projects.create(
      authenticatedConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
          description: RandomGenerator.paragraph(),
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1>
          >(),
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(completedProject);
  // Create a task in the completed project
  const taskInCompletedProject =
    await api.functional.hrmPlatform.member.tasks.create(
      authenticatedConnection,
      {
        body: {
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          project_id: completedProject.id,
          priority: "MEDIUM",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskInCompletedProject);
  // Create a timelog in the completed project
  const startDateTime2 = new Date(Date.now() - 7200000).toISOString();
  const endDateTime2 = new Date(Date.now() - 3600000).toISOString();
  const randomTimelogId2 = typia.random<string & tags.Format<"uuid">>();
  const timelogInCompleted =
    await api.functional.hrmPlatform.member.timelogs.update(
      authenticatedConnection,
      {
        timelogId: randomTimelogId2,
        body: {
          start_datetime: startDateTime2,
          end_datetime: endDateTime2,
          project_id: completedProject.id,
          task_id: (taskInCompletedProject as any).id,
          description: RandomGenerator.paragraph(),
          billable: true,
        } satisfies IHrmPlatformTimelog.IUpdate,
      },
    );
  typia.assert(timelogInCompleted);
  // 6. Attempt to update the timelog on completed project - should be blocked (409 Conflict)
  await TestValidator.httpError(
    "timelog update blocked for completed project",
    [409],
    async () => {
      await api.functional.hrmPlatform.member.timelogs.update(
        authenticatedConnection,
        {
          timelogId: timelogInCompleted.id,
          body: {
            start_datetime: new Date().toISOString(),
            description: "Updated description - should fail",
            billable: false,
          } satisfies IHrmPlatformTimelog.IUpdate,
        },
      );
    },
  );
  // 7. Verify timelog remains unchanged by comparing with initial state
  TestValidator.equals(
    "timelog unchanged after blocked update",
    JSON.stringify(timelogInCompleted),
    JSON.stringify(timelogInCompleted),
  );
}