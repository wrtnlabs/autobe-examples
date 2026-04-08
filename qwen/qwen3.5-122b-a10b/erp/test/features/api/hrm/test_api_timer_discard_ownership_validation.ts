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
 * Test timer discard ownership validation between different employees.
 *
 * Validates that an employee cannot discard an active timer belonging to another employee. This test ensures the ownership enforcement business rule is properly implemented for the discard endpoint, preventing unauthorized timer manipulation across different users.
 *
 * The test follows this workflow:
 * 1. Authenticate Member A and start an active timer
 * 2. Authenticate Member B (different user)
 * 3. Member B attempts to discard Member A's timer
 * 4. Verify 404 Not Found response is returned
 *
 * This validates data isolation and ownership enforcement for timer management operations.
 */
export async function test_api_timer_discard_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (timer owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAAuth);
  // 2. Member A starts an active timer
  const timer = await generate_random_hrm_member_active_timers_create(
    memberAConnection,
    {
      body: {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmActiveTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 3. Authenticate Member B (different user attempting discard)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberBAuth);
  // 4. Member B attempts to discard Member A's timer
  await TestValidator.httpError(
    "member B cannot discard member A's timer",
    404,
    async () => {
      await api.functional.hrm.member.active_timers.discard(memberBConnection, {
        timerId: timer.id,
      });
    },
  );
}
