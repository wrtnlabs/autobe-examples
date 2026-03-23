import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving guest sessions with various filter combinations.
 *
 * This test validates the guest session listing API with different filter
 * combinations including IP address, date range, status, and search filters.
 * It ensures that each filter correctly narrows down the session list and
 * that combined filters work together properly.
 */
export async function test_api_guest_session_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(authResult);
  // 2. Create multiple guest sessions with different characteristics
  const testIp = "192.168.1.1";
  const testReferrer = "https://test-referrer.example.com";
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Create session with specific IP for IP filter test
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: testIp,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: testIp,
    } satisfies IHrmPlatformGuest.IJoin,
  });
  // Create session with specific referrer for search filter test
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: testReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  // 3. Test IP filter
  const ipFilterResult = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: testIp,
      } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(ipFilterResult);
  TestValidator.equals(
    "IP filter returns sessions with matching IP",
    ipFilterResult.data.every((session) => session.ip === testIp),
    true,
  );
  // 4. Test date range filter
  const dateRangeResult = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_start: pastDate,
        created_at_end: futureDate,
      } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "Date range filter returns sessions within range",
    dateRangeResult.data.every(
      (session) =>
        session.created_at >= pastDate && session.created_at <= futureDate,
    ),
    true,
  );
  // 5. Test status filter (active sessions)
  const activeStatusResult =
    await api.functional.hrmPlatform.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
      } satisfies IHrmPlatformGuestSession.IRequest,
    });
  typia.assert(activeStatusResult);
  TestValidator.equals(
    "Active status filter returns sessions with null expired_at",
    activeStatusResult.data.every((session) => session.expired_at === null),
    true,
  );
  // 6. Test search filter
  const searchResult = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        search: testReferrer,
      } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "Search filter returns sessions with matching content",
    searchResult.data.every(
      (session) =>
        session.ip.includes(testReferrer) ||
        session.href.includes(testReferrer) ||
        (session.referrer && session.referrer.includes(testReferrer)),
    ),
    true,
  );
  // 7. Test combined filters
  const combinedFilterResult =
    await api.functional.hrmPlatform.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
        created_at_start: pastDate,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformGuestSession.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "Combined filters apply all conditions",
    combinedFilterResult.data.every(
      (session) =>
        session.expired_at === null && session.created_at >= pastDate,
    ),
    true,
  );
  TestValidator.equals(
    "Pagination limit respected",
    combinedFilterResult.data.length <= 10,
    true,
  );
  // 8. Test empty results with non-matching filter
  const nonMatchingIp = "0.0.0.0";
  const emptyResult = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: nonMatchingIp,
      } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "Non-matching filter returns empty results",
    emptyResult.data.length,
    0,
  );
}
