import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest to establish session context
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Test filtering sessions by date range - include all sessions
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFuture = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const sessionsInRange = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: oneDayAgo.toISOString(),
        created_at_to: oneDayFuture.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessionsInRange);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    sessionsInRange.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(sessionsInRange.data),
  );
  TestValidator.equals("current page", sessionsInRange.pagination.current, 1);
  TestValidator.equals("limit", sessionsInRange.pagination.limit, 10);
  // Validate that returned sessions are within the date range
  for (const session of sessionsInRange.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session created_at >= from",
      new Date(session.created_at).getTime() >= oneDayAgo.getTime(),
    );
    TestValidator.predicate(
      "session created_at <= to",
      new Date(session.created_at).getTime() <= oneDayFuture.getTime(),
    );
  }
  // 3. Test edge case - date range that excludes all sessions (past dates)
  const oldDate = new Date("2020-01-01T00:00:00.000Z");
  const olderDate = new Date("2020-01-02T00:00:00.000Z");
  const sessionsExcluded =
    await api.functional.hrmPlatform.guest.sessions.index(guestConnection, {
      body: {
        created_at_from: oldDate.toISOString(),
        created_at_to: olderDate.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(sessionsExcluded);
  // Validate empty result with correct pagination
  TestValidator.equals(
    "no sessions in old range",
    sessionsExcluded.data.length,
    0,
  );
  TestValidator.equals("records count", sessionsExcluded.pagination.records, 0);
  TestValidator.equals("pages count", sessionsExcluded.pagination.pages, 0);
  TestValidator.equals("current page", sessionsExcluded.pagination.current, 1);
  // 4. Test filtering with only created_at_from (no upper bound)
  const sessionsFromOnly =
    await api.functional.hrmPlatform.guest.sessions.index(guestConnection, {
      body: {
        created_at_from: oneDayAgo.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(sessionsFromOnly);
  // Validate all returned sessions are after the from date
  for (const session of sessionsFromOnly.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session created_at >= from (from-only filter)",
      new Date(session.created_at).getTime() >= oneDayAgo.getTime(),
    );
  }
  // 5. Test filtering with only created_at_to (no lower bound)
  const sessionsToOnly = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessionsToOnly);
  // Validate all returned sessions are before the to date
  for (const session of sessionsToOnly.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session created_at <= to (to-only filter)",
      new Date(session.created_at).getTime() <= now.getTime(),
    );
  }
}
