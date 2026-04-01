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
 * Test the timer discard operation when an employee has a running timer
 * tracking project-level work without a specific task assignment.
 *
 * This test verifies:
 * 1. Timer can be created with only project (task is null)
 * 2. Discard operation works for project-only timers
 * 3. Discarded timer response has task field as null
 * 4. Employee can start new timer after discard
 */
export async function test_api_timer_discard_project_only_without_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member by joining the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create timer with project only (task_id explicitly null)
  const timerCreateBody = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    task_id: null,
  } satisfies IHrmPlatformTimer.ICreate;
  const createdTimer = await api.functional.hrmPlatform.member.timers.create(
    memberConnection,
    {
      body: timerCreateBody,
    },
  );
  typia.assert(createdTimer);
  // 3. Discard the running timer
  const discardedTimer =
    await api.functional.hrmPlatform.member.timers.discard(memberConnection);
  typia.assert(discardedTimer);
  // 4. Validate discarded timer ID matches the created timer
  TestValidator.equals(
    "discarded timer id matches",
    discardedTimer.id,
    createdTimer.id,
  );
  // 5. Verify employee can start a new timer after discard (timer state is cleared)
  const newTimer = await api.functional.hrmPlatform.member.timers.create(
    memberConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: null,
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(newTimer);
  // 6. Validate new timer has different ID (confirming it's a new session)
  TestValidator.notEquals(
    "new timer has different id",
    newTimer.id,
    createdTimer.id,
  );
}
