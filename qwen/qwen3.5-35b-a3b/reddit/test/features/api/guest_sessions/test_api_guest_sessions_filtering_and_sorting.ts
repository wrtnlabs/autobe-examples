import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuestSession";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple guest sessions with varied attributes
  const baseConnection: api.IConnection = { host: connection.host };
  const ipAddresses = [
    "192.168.1.10",
    "192.168.1.20",
    "10.0.0.1",
    "172.16.0.1",
  ];
  const referrerDomains = [
    "https://google.com/search",
    "https://facebook.com/feed",
    "https://twitter.com/home",
    "https://reddit.com/r/popular",
  ];
  const guestSessions: IRedditPlatformGuest.IAuthorized[] = [];
  const now = new Date();
  // Create 10 guest sessions with different attributes
  for (let i = 0; i < 10; i++) {
    const sessionIp = ipAddresses[i % ipAddresses.length];
    const sessionReferrer =
      referrerDomains[Math.floor(i / 2) % referrerDomains.length];
    const sessionHref = "https://reddit.com/";
    const sessionFingerprint = `fingerprint-${i}-${RandomGenerator.alphaNumeric(8)}`;
    const sessionCreatedAt = new Date(
      now.getTime() - (9 - i) * 2 * 60 * 60 * 1000,
    );
    const guestConnection: api.IConnection = { host: connection.host };
    const guest = await authorize_guest_join(guestConnection, {
      body: {
        fingerprint: sessionFingerprint,
        href: sessionHref,
        referrer: sessionReferrer,
        ip: sessionIp,
      },
    });
    typia.assert(guest);
    // Update guest session with specific creation time (if API supports it)
    // For now, we'll query sessions and validate based on actual creation times
    guestSessions.push(guest);
  }
  // 2. Test IP address filter
  const testIp = ipAddresses[0];
  const ipFilterConnection: api.IConnection = { host: connection.host };
  const ipFilteredResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      ipFilterConnection,
      {
        body: {
          ip: testIp,
        },
      },
    );
  typia.assert(ipFilteredResult);
  // Verify all returned sessions have the correct IP
  for (const session of ipFilteredResult.data) {
    TestValidator.equals(
      `IP filter session ${session.id} IP`,
      session.ip,
      testIp,
    );
  }
  // 3. Test date range filters
  const dateAfter = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
  const dateBefore = new Date(new Date().getTime() + 1 * 60 * 60 * 1000);
  const dateRangeConnection: api.IConnection = { host: connection.host };
  const dateRangeResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      dateRangeConnection,
      {
        body: {
          createdAtAfter: dateAfter.toISOString(),
          createdAtBefore: dateBefore.toISOString(),
        },
      },
    );
  typia.assert(dateRangeResult);
  // Verify all returned sessions are within date range
  for (const session of dateRangeResult.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session created after filter",
      sessionDate > dateAfter,
    );
    TestValidator.predicate(
      "session created before filter",
      sessionDate < dateBefore,
    );
  }
  // 4. Test referrer filter (partial match)
  const referrerSubstring = "google.com";
  const referrerConnection: api.IConnection = { host: connection.host };
  const referrerResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      referrerConnection,
      {
        body: {
          referrer: referrerSubstring,
        },
      },
    );
  typia.assert(referrerResult);
  // Verify all returned sessions contain the referrer substring
  for (const session of referrerResult.data) {
    if (session.referrer !== null) {
      TestValidator.predicate(
        "referrer contains substring",
        session.referrer.includes(referrerSubstring),
      );
    }
  }
  // 5. Test sorting - default (descending, newest first)
  const sortByDescConnection: api.IConnection = { host: connection.host };
  const sortByDescResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      sortByDescConnection,
      {
        body: {
          sortBy: "createdAt",
          limit: 20,
        },
      },
    );
  typia.assert(sortByDescResult);
  // Verify sessions are sorted by created_at descending
  for (let i = 1; i < sortByDescResult.data.length; i++) {
    const prevDate = new Date(sortByDescResult.data[i - 1].created_at);
    const currDate = new Date(sortByDescResult.data[i].created_at);
    TestValidator.predicate(
      `session ${i} sorted descending`,
      prevDate >= currDate,
    );
  }
  // 6. Test sorting - ascending (oldest first)
  const sortByAscConnection: api.IConnection = { host: connection.host };
  const sortByAscResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      sortByAscConnection,
      {
        body: {
          sortBy: "createdAsc",
          limit: 20,
        },
      },
    );
  typia.assert(sortByAscResult);
  // Verify sessions are sorted by created_at ascending
  for (let i = 1; i < sortByAscResult.data.length; i++) {
    const prevDate = new Date(sortByAscResult.data[i - 1].created_at);
    const currDate = new Date(sortByAscResult.data[i].created_at);
    TestValidator.predicate(
      `session ${i} sorted ascending`,
      prevDate <= currDate,
    );
  }
  // 7. Test combined filters (IP + date range + referrer)
  const combinedFilterConnection: api.IConnection = { host: connection.host };
  const combinedResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      combinedFilterConnection,
      {
        body: {
          ip: ipAddresses[1],
          createdAtAfter: dateAfter.toISOString(),
          createdAtBefore: dateBefore.toISOString(),
          referrer: "facebook.com",
        },
      },
    );
  typia.assert(combinedResult);
  // Verify all returned sessions match ALL filter criteria
  for (const session of combinedResult.data) {
    TestValidator.equals("combined IP filter", session.ip, ipAddresses[1]);
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "combined date after filter",
      sessionDate > dateAfter,
    );
    TestValidator.predicate(
      "combined date before filter",
      sessionDate < dateBefore,
    );
    if (session.referrer !== null) {
      TestValidator.predicate(
        "combined referrer filter",
        session.referrer.includes("facebook.com"),
      );
    }
  }
  // 8. Test empty results
  const emptyResultConnection: api.IConnection = { host: connection.host };
  const emptyResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      emptyResultConnection,
      {
        body: {
          ip: "0.0.0.0", // Non-existent IP
          createdAtAfter: new Date("2100-01-01").toISOString(),
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  // 9. Test pagination with filters
  const paginationConnection: api.IConnection = { host: connection.host };
  const paginationResult =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      paginationConnection,
      {
        body: {
          ip: ipAddresses[0],
          page: 1,
          limit: 3,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination page 1 limit 3",
    paginationResult.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  // Verify we got at most 3 results (or fewer if less than 3 exist)
  TestValidator.predicate(
    "pagination limit respected",
    paginationResult.data.length <= 3,
  );
  // Test page 2 to verify pagination works
  const paginationPage2Connection: api.IConnection = { host: connection.host };
  const paginationPage2Result =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      paginationPage2Connection,
      {
        body: {
          ip: ipAddresses[0],
          page: 2,
          limit: 3,
        },
      },
    );
  typia.assert(paginationPage2Result);
  TestValidator.equals(
    "pagination page 2 limit 3",
    paginationPage2Result.pagination.limit,
    3,
  );
  TestValidator.equals(
    "pagination page 2 current",
    paginationPage2Result.pagination.current,
    2,
  );
}
