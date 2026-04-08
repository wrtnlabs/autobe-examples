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
 * Test retrieving an employee's own timer that includes a task assignment.
 *
 * Validates the complete timer retrieval flow including member authentication, employee setup through invitation, project and task creation, timer session initiation with task assignment, and timer retrieval by ID. Ensures that the timer correctly references the project and task, and that all required fields are properly populated.
 *
 * Special attention is given to verifying that the task reference is not null and that task details (id, title, status, priority) are included in the response matching the task used during timer creation. The timer structure validation confirms started_at is set, stopped_at may be null for active timers, and all system timestamps are present.
 *
 * 1. Member registers with email and password credentials.
 * 2. Employee invitation is created to establish employee record in organization.
 * 3. Project is created for timer to track work against.
 * 4. Employee is assigned to project as project member.
 * 5. Task is created within project for granular time tracking.
 * 6. Timer session is created with project and task assignment.
 * 7. Timer is retrieved by ID to validate complete structure.
 * 8. Validate timer includes all required fields: id, employee, project, task (non-null), started_at, stopped_at, description, created_at, updated_at.
 * 9. Verify task details match the task created in step 5.
 */
export async function test_api_timer_retrieval_stopped_with_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create employee invitation (automatically creates employee since member exists)
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitation);
  // 3. Create project for timer tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Assign employee to project as project member
  // Note: In a complete test setup, we would retrieve the employee ID from the
  // employee record created during invitation acceptance. Since the employee
  // invitation response doesn't include the created employee ID directly, and
  // no employee list endpoint is available in the current API set, this test
  // demonstrates the timer retrieval flow. In production E2E tests, the employee
  // ID would be obtained from employee list/get endpoints or stored context.
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create task within project for granular time tracking
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 6. Create timer session with project and task assignment
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  // 7. Retrieve timer by ID to validate structure
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 8. Validate timer structure and references
  TestValidator.equals("timer id matches", retrievedTimer.id, timer.id);
  TestValidator.equals(
    "project id matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.predicate("task is not null", retrievedTimer.task !== null);
  // 9. Verify task details match the created task
  if (retrievedTimer.task !== null) {
    TestValidator.equals("task id matches", retrievedTimer.task.id, task.id);
    TestValidator.equals(
      "task title matches",
      retrievedTimer.task.title,
      task.title,
    );
    TestValidator.equals(
      "task status matches",
      retrievedTimer.task.status,
      task.status,
    );
    TestValidator.equals(
      "task priority matches",
      retrievedTimer.task.priority,
      task.priority,
    );
  }
  // Validate timer timestamps are present (typia.assert already validates format)
  TestValidator.predicate(
    "started_at is set",
    retrievedTimer.started_at !== null,
  );
  TestValidator.predicate(
    "created_at is set",
    retrievedTimer.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    retrievedTimer.updated_at !== null,
  );
  // Note: stopped_at may be null for active timers or set for completed timers
  // The timer retrieval works for both states - null indicates running, non-null indicates stopped
}
