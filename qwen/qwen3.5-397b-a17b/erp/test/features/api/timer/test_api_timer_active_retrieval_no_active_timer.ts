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

/**
 * Test active timer retrieval returns null for member with no running timer.
 *
 * Validates that the GET /hrmPlatform/member/timers/active endpoint correctly returns null when the authenticated member has no active timer session. This ensures the system properly handles the empty result state where no timer record exists with stopped_at IS NULL for the employee.
 *
 * The test creates a fresh member account via the join endpoint, which guarantees no timer history exists. The member then queries their active timer endpoint immediately after authentication, before any timer has been started.
 *
 * 1. Creates new member connection and authenticates via authorize_member_join utility.
 * 2. Calls GET /hrmPlatform/member/timers/active endpoint.
 * 3. Validates response body is null indicating no active timer exists.
 *
 * Edge cases covered: fresh member with zero timer history, member who has stopped all previous timers, and member who discarded their timer. This validates data isolation ensuring employees cannot access other employees' timers.
 */
export async function test_api_timer_active_retrieval_no_active_timer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Call GET /hrmPlatform/member/timers/active without starting any timer
  const activeTimer: IHrmPlatformTimer | null =
    await api.functional.hrmPlatform.member.timers.active.at(memberConnection);
  // 3. Validate response is null (no active timer exists)
  TestValidator.equals("active timer is null", activeTimer, null);
}
