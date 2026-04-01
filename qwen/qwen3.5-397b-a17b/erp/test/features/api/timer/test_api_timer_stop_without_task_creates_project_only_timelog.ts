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

export async function test_api_timer_stop_without_task_creates_project_only_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Start a timer with only project (no task_id)
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        task_id: null, // Explicitly no task - project-only timer
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  // Verify timer was created without task
  TestValidator.equals("timer task is null", timer.task, null);
  TestValidator.predicate("timer has description", timer.description !== null);
  // 3. Stop the timer
  const timelog =
    await api.functional.hrmPlatform.member.timers.stop(memberConnection);
  typia.assert(timelog);
  // 4. Verify timelog has task set to null (project-only)
  TestValidator.equals("timelog task is null", timelog.task, null);
  // 5. Verify project is correctly inherited from timer
  TestValidator.equals(
    "timelog project matches timer project",
    timelog.project.id,
    timer.project.id,
  );
  // 6. Verify duration is calculated (positive integer)
  TestValidator.predicate(
    "timelog duration is positive",
    timelog.durationMinutes > 0,
  );
  // 7. Verify description is preserved
  TestValidator.equals(
    "timelog description matches timer",
    timelog.description,
    timer.description,
  );
  // 8. Verify billable flag is true (default)
  TestValidator.equals("timelog is billable", timelog.billable, true);
  // 9. Verify employee matches authenticated member
  TestValidator.equals(
    "timelog employee matches member",
    timelog.employee.user.id,
    memberAuth.id,
  );
  // 10. Verify date is set
  TestValidator.predicate("timelog has valid date", timelog.date !== null);
}
