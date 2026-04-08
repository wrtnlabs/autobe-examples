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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that an authenticated employee can successfully retrieve their own timer record.
 *
 * Validates the complete timer retrieval workflow including member registration,
 * project creation, timer creation with project association, and retrieval with
 * ownership verification. Ensures that the timer correctly references the project
 * and that all required fields are populated with valid data.
 *
 * Special attention is given to verifying ownership constraints (employee can only
 * retrieve their own timers), status validation, and timestamp completeness for
 * tracking elapsed time.
 *
 * 1. Register a member account with email and password using authorize_member_join.
 * 2. Create a new project within the member's organization.
 * 3. Create a timer associated with the created project.
 * 4. Verify the timer was created with status 'started' and duration_seconds = 0.
 * 5. Retrieve the timer using GET /hrmPlatform/member/timers/{timerId} with authenticated session.
 * 6. Validate the response contains correct timer data:
 *    - hrm_platform_project_id matches the created project
 *    - status is 'started'
 *    - duration_seconds and last_tick_at are populated
 *    - All timestamps (created_at, updated_at) are present
 *    - Employee ID matches authenticated member
 */
export async function test_api_timer_retrieve_owned_timer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member and get authentication token
  const joinConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authResult);
  // Step 2: Create project within member's organization
  const projectConnection: api.IConnection = { host: connection.host };
  const project = await api.functional.hrmPlatform.member.projects.create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // Step 3: Create timer associated with the project
  const timerConnection: api.IConnection = { host: connection.host };
  const timer = await api.functional.hrmPlatform.member.timers.create(
    timerConnection,
    {
      body: {
        hrm_platform_project_id: project.id,
        hrm_platform_task_id: undefined,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Step 4: Verify timer was created correctly
  TestValidator.equals("timer status", timer.status, "started");
  TestValidator.equals("initial duration", timer.duration_seconds, 0);
  TestValidator.predicate(
    "has valid project reference",
    timer.hrm_platform_project_id === project.id,
  );
  TestValidator.predicate(
    "has last tick timestamp",
    timer.last_tick_at !== undefined && timer.last_tick_at !== null,
  );
  // Step 5: Retrieve the timer using authenticated connection
  const retrieveConnection: api.IConnection = { host: connection.host };
  const retrievedTimer = await api.functional.hrmPlatform.member.timers.at(
    retrieveConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(retrievedTimer);
  // Step 6: Validate retrieved timer data
  TestValidator.equals("timer id matches", retrievedTimer.id, timer.id);
  TestValidator.equals(
    "timer status maintained",
    retrievedTimer.status,
    "started",
  );
  TestValidator.equals(
    "project id matches",
    retrievedTimer.hrm_platform_project_id,
    project.id,
  );
  TestValidator.equals(
    "duration consistent",
    retrievedTimer.duration_seconds,
    timer.duration_seconds,
  );
  TestValidator.equals(
    "last tick consistent",
    retrievedTimer.last_tick_at,
    timer.last_tick_at,
  );
  TestValidator.equals(
    "created at matches",
    retrievedTimer.created_at,
    timer.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    retrievedTimer.updated_at,
    timer.updated_at,
  );
  TestValidator.equals("deleted at is null", retrievedTimer.deleted_at, null);
  TestValidator.equals(
    "employee id matches",
    retrievedTimer.hrm_platform_employee_id,
    authResult.member.id,
  );
}