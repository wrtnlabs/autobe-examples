import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test filtering guest sessions by device fingerprint and date ranges.
 *
 * Validates the filtering capabilities for guest session management by creating multiple guest accounts with different device fingerprints and session timestamps. Tests device fingerprint filtering (which requires JOIN to hrm_guests table), creation date range filtering, expiration date range filtering, and combined filter scenarios.
 *
 * Special attention is given to verifying that device fingerprint filters correctly join with the guest table, date range filters work as expected, and combined filters produce accurate results. Invalid date ranges are also tested to ensure proper error handling.
 *
 * 1. Create three guest accounts with unique device fingerprints and timestamps
 * 2. Query sessions filtered by device_fingerprint (first guest)
 * 3. Validate only sessions for the first guest are returned
 * 4. Query sessions filtered by created_at date range
 * 5. Validate only sessions within the date range are returned
 * 6. Query sessions filtered by expired_at date range
 * 7. Validate only sessions expiring within the range are returned
 * 8. Test combined filters (device fingerprint + date range)
 * 9. Validate combined filter results match intersection of individual filters
 * 10. Test invalid date range (created_at_from > created_at_to) returns error
 */
export async function test_api_guest_sessions_device_and_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three guest accounts with unique device fingerprints and timestamps
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1: IHrmGuest.IAuthorized = await authorize_guest_join(
    guest1Connection,
    {
      body: {
        device_fingerprint: `device_${RandomGenerator.alphaNumeric(16)}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  typia.assert(guest1);
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2: IHrmGuest.IAuthorized = await authorize_guest_join(
    guest2Connection,
    {
      body: {
        device_fingerprint: `device_${RandomGenerator.alphaNumeric(16)}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  typia.assert(guest2);
  const guest3Connection: api.IConnection = { host: connection.host };
  const guest3: IHrmGuest.IAuthorized = await authorize_guest_join(
    guest3Connection,
    {
      body: {
        device_fingerprint: `device_${RandomGenerator.alphaNumeric(16)}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  typia.assert(guest3);
  // 2. Query sessions filtered by device_fingerprint (first guest)
  const deviceFilterResult: IPageIHrmGuestSession.ISummary =
    await api.functional.hrm.guest.guest.sessions.index(connection, {
      body: {
        device_fingerprint: guest1.device_fingerprint,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    });
  typia.assert(deviceFilterResult);
  // 3. Validate only sessions for the first guest are returned
  TestValidator.equals(
    "device fingerprint filter returns sessions for matching guest",
    deviceFilterResult.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all filtered sessions belong to first guest",
    deviceFilterResult.data.every((session) => session.guest.id === guest1.id),
  );
  TestValidator.predicate(
    "session includes guest with correct device_fingerprint",
    deviceFilterResult.data.every(
      (session) =>
        session.guest.device_fingerprint === guest1.device_fingerprint,
    ),
  );
  // 4. Query sessions filtered by created_at date range
  const createdAtFrom = new Date(
    new Date(guest1.created_at).getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const createdAtTo = new Date(
    new Date(guest3.created_at).getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const dateRangeResult: IPageIHrmGuestSession.ISummary =
    await api.functional.hrm.guest.guest.sessions.index(connection, {
      body: {
        created_at_from: createdAtFrom satisfies string &
          tags.Format<"date-time">,
        created_at_to: createdAtTo satisfies string & tags.Format<"date-time">,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    });
  typia.assert(dateRangeResult);
  // 5. Validate only sessions within the date range are returned
  TestValidator.predicate(
    "date range filter returns sessions within range",
    dateRangeResult.data.every((session) => {
      const sessionCreatedAt = new Date(session.created_at).getTime();
      const fromTime = new Date(createdAtFrom).getTime();
      const toTime = new Date(createdAtTo).getTime();
      return sessionCreatedAt >= fromTime && sessionCreatedAt <= toTime;
    }),
  );
  // 6. Query sessions filtered by expired_at date range
  const expiredAtFrom = new Date(
    new Date(guest1.created_at).getTime() - 1000 * 60 * 60,
  ).toISOString();
  const expiredAtTo = new Date(
    new Date(guest3.created_at).getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const expiredDateRangeResult: IPageIHrmGuestSession.ISummary =
    await api.functional.hrm.guest.guest.sessions.index(connection, {
      body: {
        expired_at_from: expiredAtFrom satisfies string &
          tags.Format<"date-time">,
        expired_at_to: expiredAtTo satisfies string & tags.Format<"date-time">,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    });
  typia.assert(expiredDateRangeResult);
  // 7. Validate only sessions expiring within the range are returned
  TestValidator.predicate(
    "expired_at range filter returns sessions expiring within range",
    expiredDateRangeResult.data.every((session) => {
      const sessionExpiredAt = new Date(session.expired_at).getTime();
      const fromTime = new Date(expiredAtFrom).getTime();
      const toTime = new Date(expiredAtTo).getTime();
      return sessionExpiredAt >= fromTime && sessionExpiredAt <= toTime;
    }),
  );
  // 8. Test combined filters (device fingerprint + date range)
  const combinedFilterResult: IPageIHrmGuestSession.ISummary =
    await api.functional.hrm.guest.guest.sessions.index(connection, {
      body: {
        device_fingerprint: guest1.device_fingerprint,
        created_at_from: createdAtFrom satisfies string &
          tags.Format<"date-time">,
        created_at_to: createdAtTo satisfies string & tags.Format<"date-time">,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    });
  typia.assert(combinedFilterResult);
  // 9. Validate combined filter results match intersection of individual filters
  TestValidator.predicate(
    "combined filters return sessions matching both criteria",
    combinedFilterResult.data.every((session) => {
      return (
        session.guest.id === guest1.id &&
        new Date(session.created_at).getTime() >=
          new Date(createdAtFrom).getTime() &&
        new Date(session.created_at).getTime() <=
          new Date(createdAtTo).getTime()
      );
    }),
  );
  // 10. Test invalid date range (created_at_from > created_at_to) returns error
  await TestValidator.error("invalid date range returns error", async () => {
    await api.functional.hrm.guest.guest.sessions.index(connection, {
      body: {
        created_at_from: "2099-12-31T23:59:59.999Z" satisfies string &
          tags.Format<"date-time">,
        created_at_to: "2020-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time">,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    });
  });
}
