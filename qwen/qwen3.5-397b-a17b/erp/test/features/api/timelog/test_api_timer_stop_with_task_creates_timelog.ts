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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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
 * Test stopping a running timer with task assigned creates a timelog.
 *
 * This test validates the complete timer-to-timelog workflow:
 * 1. Member authentication via join
 * 2. Timer creation with project and task
 * 3. Timer stop operation
 * 4. Timelog validation (duration, project, task, description, billable, date)
 * 5. Verification that timer is no longer active
 */
export async function test_api_timer_stop_with_task_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Start a timer with project and task
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        description: description,
      },
    },
  );
  typia.assert(timer);
  TestValidator.predicate("timer has task", timer.task !== null);
  TestValidator.equals(
    "timer description matches",
    timer.description,
    description,
  );
  // 3. Wait briefly to ensure meaningful duration (simulated - in real test would wait)
  // For E2E test purposes, we proceed immediately as the API calculates duration
  const stopTime = new Date();
  // 4. Stop the timer
  const timelog =
    await api.functional.hrmPlatform.member.timers.stop(memberConnection);
  typia.assert(timelog);
  // 5. Validate timelog inherits from timer
  TestValidator.equals(
    "timelog project matches timer project",
    timelog.project.id,
    timer.project.id,
  );
  TestValidator.predicate(
    "timelog task matches timer task",
    timelog.task !== null &&
      timer.task !== null &&
      timelog.task.id === timer.task.id,
  );
  TestValidator.equals(
    "timelog description matches timer description",
    timelog.description,
    description,
  );
  TestValidator.equals("timelog is billable", timelog.billable, true);
  TestValidator.predicate("duration is positive", timelog.durationMinutes > 0);
  // Validate date matches stop timestamp (same day)
  const timelogDate = new Date(timelog.date);
  TestValidator.equals(
    "timelog date year matches",
    timelogDate.getFullYear(),
    stopTime.getFullYear(),
  );
  TestValidator.equals(
    "timelog date month matches",
    timelogDate.getMonth(),
    stopTime.getMonth(),
  );
  TestValidator.equals(
    "timelog date day matches",
    timelogDate.getDate(),
    stopTime.getDate(),
  );
  // Validate employee reference
  TestValidator.equals(
    "timelog employee matches authenticated member",
    timelog.employee.user.id,
    authResult.id,
  );
  // 6. Verify timer is no longer accessible (would return 404 if we try to stop again)
  await TestValidator.error(
    "stopping already stopped timer throws error",
    async () => {
      await api.functional.hrmPlatform.member.timers.stop(memberConnection);
    },
  );
}
