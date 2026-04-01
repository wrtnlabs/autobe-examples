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
 * Test the timer discard operation after the employee has updated the running timer's description and project/task assignment.
 *
 * **Test Steps:**
 * 1. Authenticate as a member by joining the platform
 * 2. Start a new timer with initial project, task, and description
 * 3. Update the running timer to change the description to different text
 * 4. Discard the updated running timer
 * 5. Validate the response contains the timer with the most recent description (not the initial values)
 * 6. Verify timer structure is valid
 *
 * **Validation Points:**
 * - Discard operation returns timer with updated description (not original)
 * - Discarded timer ID matches the created timer ID
 * - Timer structure passes typia.assert validation
 */
export async function test_api_timer_discard_with_description_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create initial timer with project, task, and description
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // 3. Update the running timer with a different description
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedTimer =
    await api.functional.hrmPlatform.member.timers.putByTimerid(
      memberConnection,
      {
        timerId: timer.id,
        body: {
          description: updatedDescription,
        } satisfies IHrmPlatformTimer.IUpdate,
      },
    );
  typia.assert(updatedTimer);
  // Verify the update was applied
  TestValidator.equals(
    "description updated",
    updatedTimer.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "description changed from initial",
    updatedTimer.description,
    initialDescription,
  );
  // 4. Discard the updated timer
  const discardedTimer =
    await api.functional.hrmPlatform.member.timers.discard(memberConnection);
  typia.assert(discardedTimer);
  // 5. Validate the discarded timer contains the updated description (not original)
  TestValidator.equals(
    "discarded timer has updated description",
    discardedTimer.description,
    updatedDescription,
  );
  TestValidator.notEquals(
    "discarded timer does not have initial description",
    discardedTimer.description,
    initialDescription,
  );
  TestValidator.equals(
    "discarded timer ID matches",
    discardedTimer.id,
    timer.id,
  );
}
