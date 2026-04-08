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
 * Test permission denial when one employee attempts to stop another employee's active timer.
 *
 * Validates that the system enforces timer ownership restrictions by preventing employees from stopping timers that belong to other employees. This test ensures proper permission-based access control for active timer operations.
 *
 * The test follows this flow:
 * 1. First member (member1) registers and authenticates to the HRM system
 * 2. Member1 starts an active timer for a project
 * 3. Second member (member2) registers and authenticates independently
 * 4. Member2 attempts to stop member1's active timer using the timer ID
 * 5. System returns 403 Forbidden error due to permission violation
 * 6. Timer remains active and accessible only to its owner
 *
 * This validates the business rule that each employee can only manage their own active timers, preventing unauthorized time manipulation across the organization.
 */
export async function test_api_active_timer_stop_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authenticates and creates timer
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Member1 starts an active timer
  const timer = await generate_random_hrm_member_active_timers_create(
    member1Connection,
    {
      body: {
        projectId: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmActiveTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 3. Second member authenticates independently
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member2Auth);
  // 4. Member2 attempts to stop member1's timer - should fail with 403
  await TestValidator.httpError(
    "permission denied for stopping other member's timer",
    403,
    async () => {
      await api.functional.hrm.member.active_timers.erase(member2Connection, {
        timerId: timer.id,
      });
    },
  );
}
