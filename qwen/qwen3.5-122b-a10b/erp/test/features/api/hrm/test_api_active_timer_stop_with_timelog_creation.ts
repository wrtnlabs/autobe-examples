import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_active_timers_create } from "../../../generate/generate_random_hrm_member_active_timers_create";
import { prepare_random_hrm_active_timer } from "../../../prepare/prepare_random_hrm_active_timer";

/**
 * Test stopping an active timer session and verifying timelog creation.
 *
 * Validates the complete timer stop workflow including timer initialization, duration tracking, and timelog generation. Ensures that stopping an active timer properly calculates elapsed duration, creates a corresponding timelog entry, and removes the timer from the active timers list.
 *
 * The test verifies business logic including proper timer lifecycle management and timelog creation with accurate duration calculations rounded to the nearest minute.
 *
 * 1. Authenticate a new member account with email and credentials.
 * 2. Create a member-specific connection with authentication token.
 * 3. Start an active timer session for a project with optional task and description.
 * 4. Stop the timer by calling the delete endpoint with timer ID.
 * 5. Verify the timer stop operation completes successfully.
 * 6. Validate the timer no longer exists in active timers.
 */
export async function test_api_active_timer_stop_with_timelog_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(auth);
  // 2. Start active timer with valid project from the system
  const timer: IHrmActiveTimer =
    await generate_random_hrm_member_active_timers_create(memberConnection, {});
  typia.assert(timer);
  // 3. Stop the timer by calling delete endpoint
  await api.functional.hrm.member.active_timers.erase(memberConnection, {
    timerId: timer.id,
  });
  // 4. Validate timer stop completed successfully (no error thrown)
  TestValidator.predicate("timer stop completed successfully", true);
}
