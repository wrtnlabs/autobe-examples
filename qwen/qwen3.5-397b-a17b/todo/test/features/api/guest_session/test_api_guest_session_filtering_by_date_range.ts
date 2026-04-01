import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest sessions by creation date range.
 *
 * This test verifies:
 * 1. created_at_from filter returns sessions created on or after the specified timestamp
 * 2. created_at_to filter returns sessions created on or before the specified timestamp
 * 3. Combined date range filtering with both from and to parameters
 * 4. Edge cases where no sessions match the date criteria returns empty data with correct pagination
 */
export async function test_api_guest_session_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connections with different timestamps
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guest1Connection, {
    body: {
      device_fingerprint: "test-device-fingerprint-1",
      href: "https://example.com/page1",
      referrer: "https://example.com/ref1",
    },
  });
  typia.assert(guest1);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guest2Connection, {
    body: {
      device_fingerprint: "test-device-fingerprint-2",
      href: "https://example.com/page2",
      referrer: "https://example.com/ref2",
    },
  });
  typia.assert(guest2);
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const guest3Connection: api.IConnection = { host: connection.host };
  const guest3 = await authorize_guest_join(guest3Connection, {
    body: {
      device_fingerprint: "test-device-fingerprint-3",
      href: "https://example.com/page3",
      referrer: "https://example.com/ref3",
    },
  });
  typia.assert(guest3);
  // Get all sessions to establish baseline and capture timestamps
  const allSessions = await api.functional.multiUserTodo.guest.sessions.index(
    guest1Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IMultiUserTodoGuestSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.predicate(
    "baseline sessions exist",
    () => allSessions.data.length >= 3,
  );
  // Capture timestamps from the created sessions
  const guest1Session = allSessions.data.find(
    (s) => s.guest.device_fingerprint === "test-device-fingerprint-1",
  );
  const guest3Session = allSessions.data.find(
    (s) => s.guest.device_fingerprint === "test-device-fingerprint-3",
  );
  TestValidator.predicate(
    "guest1 session found",
    () => guest1Session !== undefined,
  );
  TestValidator.predicate(
    "guest3 session found",
    () => guest3Session !== undefined,
  );
  if (guest1Session && guest3Session) {
    // Test 1: created_at_from filter - should return sessions from guest1's time forward
    const fromTime = guest1Session.created_at;
    const sessionsFrom =
      await api.functional.multiUserTodo.guest.sessions.index(
        guest1Connection,
        {
          body: {
            page: 1,
            limit: 100,
            created_at_from: fromTime,
          } satisfies IMultiUserTodoGuestSession.IRequest,
        },
      );
    typia.assert(sessionsFrom);
    TestValidator.predicate(
      "from filter returns sessions",
      () => sessionsFrom.data.length > 0,
    );
    TestValidator.predicate(
      "from filter pagination valid",
      () => sessionsFrom.pagination.pages >= 1,
    );
    // Test 2: created_at_to filter - should return sessions up to guest3's time
    const toTime = guest3Session.created_at;
    const sessionsTo = await api.functional.multiUserTodo.guest.sessions.index(
      guest1Connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_to: toTime,
        } satisfies IMultiUserTodoGuestSession.IRequest,
      },
    );
    typia.assert(sessionsTo);
    TestValidator.predicate(
      "to filter returns sessions",
      () => sessionsTo.data.length > 0,
    );
    // Test 3: Combined date range filtering
    const sessionsRange =
      await api.functional.multiUserTodo.guest.sessions.index(
        guest1Connection,
        {
          body: {
            page: 1,
            limit: 100,
            created_at_from: fromTime,
            created_at_to: toTime,
          } satisfies IMultiUserTodoGuestSession.IRequest,
        },
      );
    typia.assert(sessionsRange);
    TestValidator.predicate(
      "range filter returns valid pagination",
      () => sessionsRange.pagination.pages >= 0,
    );
    // Validate all returned sessions are within the date range
    for (const session of sessionsRange.data) {
      TestValidator.predicate(
        "session created_at >= fromTime",
        () =>
          new Date(session.created_at).getTime() >=
          new Date(fromTime).getTime(),
      );
      TestValidator.predicate(
        "session created_at <= toTime",
        () =>
          new Date(session.created_at).getTime() <= new Date(toTime).getTime(),
      );
    }
  }
  // Test 4: Edge case - future date range (no sessions should match)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const sessionsFuture =
    await api.functional.multiUserTodo.guest.sessions.index(guest1Connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_from: futureDate,
      } satisfies IMultiUserTodoGuestSession.IRequest,
    });
  typia.assert(sessionsFuture);
  TestValidator.equals(
    "future date returns empty data",
    sessionsFuture.data.length,
    0,
  );
  TestValidator.equals(
    "future date pagination records",
    sessionsFuture.pagination.records,
    0,
  );
  // Test 5: Edge case - very past date range (no sessions should match)
  const pastDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const sessionsPast = await api.functional.multiUserTodo.guest.sessions.index(
    guest1Connection,
    {
      body: {
        page: 1,
        limit: 100,
        created_at_to: pastDate,
      } satisfies IMultiUserTodoGuestSession.IRequest,
    },
  );
  typia.assert(sessionsPast);
  TestValidator.equals(
    "past date returns empty data",
    sessionsPast.data.length,
    0,
  );
  TestValidator.equals(
    "past date pagination records",
    sessionsPast.pagination.records,
    0,
  );
}
