import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test retrieving a completed timer session that has been stopped.
 * 1. Authenticate member by joining HRM platform
 * 2. Create a new timer session
 * 3. Stop the timer to create completed timer record
 * 4. Retrieve the completed timer
 * 5. Validate all fields including stopped_at timestamp
 */
export async function test_api_timer_view_completed_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a timer session
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {},
  );
  typia.assert(timer);
  // 3. Stop the timer (DELETE creates completed timer)
  await api.functional.hrmPlatform.member.timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 4. Retrieve the completed timer
  const completedTimer = await api.functional.hrmPlatform.member.timers.at(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(completedTimer);
  // 5. Validate completed timer fields
  TestValidator.equals("timer ID matches", completedTimer.id, timer.id);
  TestValidator.equals(
    "started_at preserved",
    completedTimer.started_at,
    timer.started_at,
  );
  TestValidator.predicate(
    "stopped_at is not null",
    completedTimer.stopped_at !== null,
  );
  TestValidator.predicate(
    "employee info exists",
    completedTimer.employee !== null,
  );
  TestValidator.predicate(
    "project info exists",
    completedTimer.project !== null,
  );
  TestValidator.equals(
    "employee ID matches",
    completedTimer.employee.id,
    timer.employee.id,
  );
  TestValidator.equals(
    "project ID matches",
    completedTimer.project.id,
    timer.project.id,
  );
  TestValidator.predicate(
    "created_at exists",
    completedTimer.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    completedTimer.updated_at !== undefined,
  );
}
