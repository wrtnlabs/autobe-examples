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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test retrieving an employee's own active running timer.
 *
 * Validates the complete timer retrieval flow including member authentication, employee invitation creation, project setup, project member assignment, timer creation, and timer retrieval by ID. Ensures that the running timer correctly shows stopped_at as null and includes all expected fields such as timer ID, employee reference, project reference, started_at timestamp, description, and system timestamps.
 *
 * Special attention is given to verifying that the timer is in a running state (stopped_at is null) and that the project details in the response match the project used during timer creation. The employee must be assigned to the project as a project member before creating a timer.
 *
 * 1. Member registers and authenticates using authorize_member_join utility function.
 * 2. Create employee invitation to establish employee record in the organization.
 * 3. Create a project for the timer to track work against.
 * 4. Assign the employee to the project as a project member (required for timer creation).
 * 5. Create a running timer session with the project assignment and optional description.
 * 6. Retrieve the timer by its ID using the GET endpoint.
 * 7. Validate that the retrieved timer has all expected fields including stopped_at as null (running state).
 * 8. Verify the project reference in the response matches the created project.
 */
export async function test_api_timer_retrieval_running(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create employee invitation to establish employee record
  // When the member email already exists, this creates an employee record immediately
  const employeeResult =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: memberAuth.email,
        },
      },
    );
  typia.assert(employeeResult);
  // 3. Create a project for the timer
  const project =
    await generate_random_hrm_platform_member_projects_create(memberConnection, {});
  typia.assert(project);
  // 4. Assign employee to project as project member
  // The employeeResult contains the employee record when member exists
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeResult.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create a running timer session with project assignment
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  // 6. Retrieve the timer by its ID
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // 7. Validate timer fields
  TestValidator.equals("timer ID matches", retrievedTimer.id, timer.id);
  TestValidator.equals(
    "employee ID matches",
    retrievedTimer.employee.id,
    employeeResult.id,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedTimer.project.id,
    project.id,
  );
  TestValidator.predicate(
    "timer is running (stopped_at is null)",
    retrievedTimer.stopped_at === null,
  );
  TestValidator.predicate(
    "started_at is set",
    retrievedTimer.started_at !== null,
  );
  TestValidator.equals(
    "description matches",
    retrievedTimer.description,
    timer.description,
  );
  // 8. Verify project details match
  TestValidator.equals(
    "project name matches",
    retrievedTimer.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedTimer.project.color,
    project.color,
  );
  TestValidator.equals(
    "project status is active",
    retrievedTimer.project.status,
    "active",
  );
}