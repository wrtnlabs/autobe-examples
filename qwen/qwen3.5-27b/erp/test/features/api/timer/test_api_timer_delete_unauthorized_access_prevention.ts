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
 * Test authorization enforcement for timer deletion.
 * 1. First member joins and creates a timer
 * 2. Second member joins separately
 * 3. Second member attempts to delete first member's timer
 * 4. Verify 403 Forbidden error is returned
 * 5. Verify timer still exists for first member
 */
export async function test_api_timer_delete_unauthorized_access_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member authentication
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member1Auth);
  // 2. First member creates a timer
  const timer = await generate_random_hrm_platform_member_timers_create(
    member1Connection,
    {},
  );
  typia.assert(timer);
  // 3. Verify timer belongs to first member
  TestValidator.equals(
    "timer belongs to first member",
    timer.employee.member.id,
    member1Auth.id,
  );
  // 4. Second member authentication
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member2Auth);
  // 5. Verify members have different identities
  TestValidator.notEquals(
    "members have different IDs",
    member1Auth.id,
    member2Auth.id,
  );
  TestValidator.notEquals(
    "members have different emails",
    member1Auth.email,
    member2Auth.email,
  );
  // 6. Second member attempts to delete first member's timer
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "unauthorized timer deletion returns 403",
    403,
    async () =>
      await api.functional.hrmPlatform.member.timers.erase(member2Connection, {
        timerId: timer.id,
      }),
  );
  // 7. Verify timer still exists by checking first member can still access it
  // We verify by attempting to delete with owner - if timer existed, this succeeds
  await TestValidator.predicate(
    "timer still exists after unauthorized deletion attempt",
    async () => {
      try {
        await api.functional.hrmPlatform.member.timers.erase(
          member1Connection,
          {
            timerId: timer.id,
          },
        );
        return true; // Timer existed and was successfully deleted by owner
      } catch {
        return false; // Timer didn't exist
      }
    },
  );
}
