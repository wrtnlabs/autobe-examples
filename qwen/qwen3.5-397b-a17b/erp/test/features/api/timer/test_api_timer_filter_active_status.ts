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

/**
 * Test filtering timer sessions by active status.
 *
 * Validates the PATCH /hrmPlatform/member/timers endpoint's status filtering functionality for timer sessions. The test verifies that filtering by 'active' status returns only running timers (stopped_at is null) with correct elapsedTime values, while filtering by 'completed' status returns only stopped timers (stopped_at has value) with proper duration values.
 *
 * The test covers the single active timer constraint enforcement (at most one active timer per employee), pagination metadata validation, and computed field accuracy (status, duration, elapsedTime).
 *
 * 1. Member authentication via authorize_member_join utility function.
 * 2. Query timers with status='active' filter and validate active timer properties.
 * 3. Query timers with status='completed' filter and validate completed timer properties.
 * 4. Verify pagination metadata structure and values.
 * 5. Validate single active timer constraint (at most one active timer returned).
 */
export async function test_api_timer_filter_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Query Active Timers
  const activeTimersResponse =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(activeTimersResponse);
  // Validate active timer business logic properties
  for (const timer of activeTimersResponse.data) {
    TestValidator.equals("status is active", timer.status, "active");
    TestValidator.equals(
      "stopped_at is null for active",
      timer.stopped_at,
      null,
    );
    TestValidator.equals("duration is null for active", timer.duration, null);
    TestValidator.predicate(
      "elapsedTime is populated for active",
      timer.elapsedTime !== null,
    );
    TestValidator.predicate(
      "elapsedTime is non-negative",
      timer.elapsedTime! >= 0,
    );
  }
  // Validate single active timer constraint
  TestValidator.predicate(
    "at most one active timer",
    activeTimersResponse.data.length <= 1,
  );
  // 3. Query Completed Timers
  const completedTimersResponse =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        status: "completed",
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(completedTimersResponse);
  // Validate completed timer business logic properties
  for (const timer of completedTimersResponse.data) {
    TestValidator.equals("status is completed", timer.status, "completed");
    TestValidator.predicate(
      "stopped_at has value for completed",
      timer.stopped_at !== null,
    );
    TestValidator.predicate(
      "duration is populated for completed",
      timer.duration !== null,
    );
    TestValidator.predicate("duration is non-negative", timer.duration! >= 0);
    TestValidator.equals(
      "elapsedTime is null for completed",
      timer.elapsedTime,
      null,
    );
  }
  // 4. Validate pagination metadata consistency
  TestValidator.predicate(
    "pages calculated correctly",
    activeTimersResponse.pagination.pages ===
      Math.ceil(
        activeTimersResponse.pagination.records /
          activeTimersResponse.pagination.limit,
      ),
  );
}
