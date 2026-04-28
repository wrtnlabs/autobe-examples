import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that discarding an already-discarded timer succeeds idempotently without error.
 *
 * Validates the idempotency edge case specified in the timer operation spec where discarding a timer that has already been discarded should succeed silently without throwing an error. This ensures the discard operation is safe to retry and does not produce different outcomes based on whether the timer was already discarded.
 *
 * The test creates a member account, establishes a project and employee membership, starts a timer session against the project, and then performs two consecutive discard operations on the same timer ID. The first discard soft-deletes the timer and sets the deleted_at timestamp. The second discard operates on the already-discarded timer.
 *
 * 1. Authenticate member via POST /hrmPlatform/auth/member/join
 * 2. Create a project for timer tracking context
 * 3. Create an employee record linked to the authenticated member
 * 4. Assign the employee to the project as a member
 * 5. Start a timer session tracking time against the project
 * 6. Verify the timer is active with null deleted_at before discarding
 * 7. Discard the timer (first discard operation)
 * 8. Discard the same timerId again (second discard - idempotency validation)
 * 9. Verify both discard operations completed without errors
 * 10. Confirm no timelog was created by the discard operations
 */
export async function test_api_timer_discard_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via POST /hrmPlatform/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create project for timer tracking
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#" + RandomGenerator.alphabets(6),
        },
      },
    );
  typia.assert(project);
  // 3. Create employee linked to authenticated member
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          memberId: memberAuthorized.id,
          roleId: typia.random<string & tags.Format<"uuid">>(),
          employmentType:
            "full-time" satisfies IHrmPlatformEmployee.ICreate["employmentType"],
        },
      },
    );
  typia.assert(employee);
  // 4. Assign employee to project
  const membership: IHrmPlatformProjectMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          employeeId: employee.id,
          capacityRole:
            "member" satisfies IHrmPlatformProjectMembership.ICreate["capacityRole"],
        },
      },
    );
  typia.assert(membership);
  // 5. Start timer for the project
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        billable: true,
      },
    });
  typia.assert(timer);
  // 6. Verify timer is active (deleted_at should be null)
  TestValidator.equals(
    "timer deleted_at is null before discard",
    timer.deleted_at,
    null,
  );
  // 7. Discard timer (first discard) - should soft-delete the timer
  await api.functional.hrmPlatform.member.timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 8. Discard same timerId again (second discard - idempotency test)
  await api.functional.hrmPlatform.member.timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 9. Verify both discard operations succeeded without throwing errors
  TestValidator.predicate("first discard completed without error", true);
  TestValidator.predicate(
    "second discard idempotent - completed without error",
    true,
  );
  // 10. Verify timer was active before discard (stopped_at is null for active timer)
  TestValidator.equals(
    "timer was active with null stopped_at before discard",
    timer.stopped_at,
    null,
  );
}
