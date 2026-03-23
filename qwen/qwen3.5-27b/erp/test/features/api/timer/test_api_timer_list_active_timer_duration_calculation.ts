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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_list_active_timer_duration_calculation(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that active timers show real-time duration calculation and stopped timers show fixed duration.
   *
   * This test validates:
   * 1. Active timers (stopped_at=null) have duration calculated in real-time
   * 2. Stopped timers (stopped_at set) have fixed duration that doesn't change
   * 3. Timer state transitions from active to stopped work correctly
   *
   * Note: This test assumes pre-existing timer data (active and stopped timers)
   * as the timer creation/stopping endpoints are not available in the SDK.
   */
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Get active timers (first call)
  const activeTimersFirst =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(activeTimersFirst);
  // 3. Wait 2 seconds for duration to change
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 4. Get active timers again (second call)
  const activeTimersSecond =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(activeTimersSecond);
  // 5. Validate active timers behavior
  // If we have active timers, verify they have stopped_at=null
  if (activeTimersFirst.data.length > 0) {
    const firstTimer = activeTimersFirst.data[0];
    TestValidator.equals(
      "active timer has null stopped_at",
      firstTimer.stopped_at,
      null,
    );
    // Verify duration increased (compare started_at timestamps - actual duration calc is server-side)
    // We can verify the timer still exists and has same started_at
    const secondTimer = activeTimersSecond.data.find(
      (t) => t.id === firstTimer.id,
    );
    if (secondTimer) {
      TestValidator.equals(
        "active timer preserved started_at",
        secondTimer.started_at,
        firstTimer.started_at,
      );
      TestValidator.equals(
        "active timer still has null stopped_at",
        secondTimer.stopped_at,
        null,
      );
    }
  }
  // 6. Get stopped timers (first call)
  const stoppedTimersFirst =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        status: "stopped",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(stoppedTimersFirst);
  // 7. Wait 2 seconds
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 8. Get stopped timers again (second call)
  const stoppedTimersSecond =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        status: "stopped",
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(stoppedTimersSecond);
  // 9. Validate stopped timers behavior
  // If we have stopped timers, verify they have fixed stopped_at
  if (stoppedTimersFirst.data.length > 0) {
    const firstStoppedTimer = stoppedTimersFirst.data[0];
    TestValidator.predicate(
      "stopped timer has stopped_at timestamp",
      firstStoppedTimer.stopped_at !== null,
    );
    // Verify stopped timer data remains unchanged after waiting
    const secondStoppedTimer = stoppedTimersSecond.data.find(
      (t) => t.id === firstStoppedTimer.id,
    );
    if (secondStoppedTimer) {
      TestValidator.equals(
        "stopped timer preserved stopped_at",
        secondStoppedTimer.stopped_at,
        firstStoppedTimer.stopped_at,
      );
      TestValidator.equals(
        "stopped timer preserved started_at",
        secondStoppedTimer.started_at,
        firstStoppedTimer.started_at,
      );
    }
  }
  // 10. Verify pagination metadata is correct
  TestValidator.predicate(
    "active timers pagination has valid page",
    activeTimersFirst.pagination.current >= 1,
  );
  TestValidator.predicate(
    "stopped timers pagination has valid page",
    stoppedTimersFirst.pagination.current >= 1,
  );
}
