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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that an employee can successfully retrieve their currently running timer session.
 *
 * Validates the complete active timer retrieval flow including member authentication, timer creation, and active timer endpoint access. Ensures that the response contains all required timer fields with correct values matching the created timer.
 *
 * Special attention is given to verifying that the active timer (stopped_at IS NULL) is correctly identified and returned with proper employee, project, and optional task associations.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member starts a new timer session with valid project assignment (and optional task).
 * 3. Member calls GET /hrmPlatform/member/timers/active to retrieve the active timer.
 * 4. Validates response contains timer with all required fields and correct associations.
 *
 * Validation Points:
 * - Response body is NOT null (active timer exists)
 * - Timer id is a valid UUID
 * - Timer employee matches the authenticated member's employee record
 * - Timer project matches the project assigned when starting the timer
 * - Timer task matches the optional task assigned (if provided) or is null
 * - Timer started_at is a valid ISO 8601 timestamp
 * - Timer stopped_at is null (indicating timer is still running)
 * - Timer description matches the work description provided during timer start (if any)
 * - Timer created_at and updated_at timestamps are present
 *
 * Business Logic Verified:
 * - Active timer (stopped_at IS NULL) is correctly identified and returned
 * - Timer ownership is enforced (employee sees only their own timer)
 * - All timer attributes are properly populated and accessible
 */
export async function test_api_timer_active_retrieval_with_running_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a running timer with project assignment
  const timer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {});
  typia.assert(timer);
  // 3. Retrieve active timer
  const activeTimer =
    await api.functional.hrmPlatform.member.timers.active.at(memberConnection);
  typia.assert(activeTimer);
  // 4. Validate active timer matches created timer
  TestValidator.equals("timer id matches", activeTimer.id, timer.id);
  TestValidator.equals(
    "employee id matches",
    activeTimer.employee.id,
    timer.employee.id,
  );
  TestValidator.equals(
    "project id matches",
    activeTimer.project.id,
    timer.project.id,
  );
  TestValidator.predicate(
    "timer is running (stopped_at is null)",
    activeTimer.stopped_at === null,
  );
  // Validate task if one was assigned
  if (timer.task !== null) {
    TestValidator.equals(
      "task id matches",
      activeTimer.task!.id,
      timer.task!.id,
    );
  } else {
    TestValidator.equals("task is null", activeTimer.task, null);
  }
  // Validate description matches
  TestValidator.equals(
    "description matches",
    activeTimer.description,
    timer.description,
  );
}