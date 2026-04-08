import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test timer discard operation when no active timer exists.
 *
 * Validates that the system properly handles the error case where an employee attempts to discard a timer without having an active timer session. An employee who has not started any timer (or has already stopped/discarded their timer) attempts to call the discard endpoint, and the system should reject this operation with a 404 Not Found error.
 *
 * This test ensures the business rule that discard requires an active timer to exist is enforced, and the system provides appropriate error feedback when the prerequisite condition is not met. The operation should not create any side effects when rejected.
 *
 * 1. Member registers and authenticates to obtain valid credentials.
 * 2. Employee invitation is created to establish employee record in organization context.
 * 3. Employee attempts to discard timer without starting one first.
 * 4. Validates system returns 404 error indicating no active timer exists.
 */
export async function test_api_timer_discard_no_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create employee invitation to establish employee context in organization
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {},
    );
  typia.assert(invitation);
  // 3. Attempt to discard timer without starting one (should fail with 404)
  await TestValidator.httpError(
    "discard without active timer should return 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.timers.active.discard(
        memberConnection,
      );
    },
  );
}
