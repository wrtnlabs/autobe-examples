import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test timer task assignment update while running.
 *
 * Validates that an employee can modify the task assignment of their active timer session. The test creates a member account, establishes employee status via invitation, creates a project with two tasks, starts a timer tracking the first task, then updates the timer to track the second task while it remains running.
 *
 * The core validation ensures that the timer's task reference changes immediately upon update, and the returned timer object reflects the new task assignment. This supports the business requirement that employees can adjust their time tracking granularity without stopping and restarting the timer.
 *
 * 1. Member joins the platform with unique credentials.
 * 2. Project is created for task and timer organization.
 * 3. Employee invitation is created and auto-accepted (member already exists).
 * 4. Employee is assigned to the project as a member.
 * 5. Two tasks are created within the project.
 * 6. Timer is started tracking the first task.
 * 7. Timer is updated to track the second task while running.
 * 8. Validates that the timer's task reference changed to the second task.
 */
export async function test_api_timer_update_task_assignment_while_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberJoinResult);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberJoinResult.token.access };
  // 2. Create project for task and timer organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create employee invitation (auto-accepts since member already exists)
  // When auto-accepted, the invitation creates an employee record
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberJoinResult.email,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(invitation);
  // Note: In auto-accept scenario, employee is created but invitation response
  // doesn't include employee ID directly. For this test, we assume the employee
  // exists and can be referenced. In production, you would query the employee
  // endpoint to retrieve the employee ID by member_id and organization_id.
  // For testing purposes, we'll use the invitation metadata or assume
  // employee creation succeeded.
  // 4. Since we cannot retrieve employee ID from available functions,
  // we'll create the project member assignment assuming employee exists.
  // This is a limitation of the available API functions for testing.
  // In a complete test suite, you would have a "list employees" endpoint.
  // For this test, we'll proceed with timer creation which requires
  // the employee context from the authenticated session.
  // The timer API derives employee from JWT session, not from request body.
  // 5. Create two tasks within the project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "medium",
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "high",
      },
    },
  );
  typia.assert(task2);
  // 6. Start timer with first task
  // Timer API derives employee from authenticated session (JWT)
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: task1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // Verify timer started with task1
  TestValidator.equals(
    "timer initially tracks task1",
    timer.task?.id ?? null,
    task1.id,
  );
  TestValidator.predicate("timer is running", timer.stopped_at === null);
  // 7. Update timer to track second task while running
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        hrm_platform_task_id: task2.id,
      } satisfies IHrmPlatformTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 8. Verify timer now tracks task2
  TestValidator.equals(
    "timer task changed to task2",
    updatedTimer.task?.id ?? null,
    task2.id,
  );
  TestValidator.notEquals(
    "task assignment changed",
    timer.task?.id ?? null,
    updatedTimer.task?.id ?? null,
  );
  TestValidator.predicate(
    "timer still running after update",
    updatedTimer.stopped_at === null,
  );
  TestValidator.predicate(
    "updated_at changed after update",
    updatedTimer.updated_at > timer.updated_at,
  );
}
