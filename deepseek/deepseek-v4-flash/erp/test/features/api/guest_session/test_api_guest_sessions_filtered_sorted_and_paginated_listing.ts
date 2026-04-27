import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_filtered_sorted_and_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Register a new guest — creates a member account with exactly one session
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // ─── SORTING TESTS ───────────────────────────────────────
  // 1. Default sort (-created_at descending, newest first)
  const defaultSorted =
    await api.functional.hrmTimeTracking.guest.sessions.index(guestConnection, {
      body: {} satisfies IHrmTimeTrackingMemberSession.IRequest,
    });
  typia.assert(defaultSorted);
  TestValidator.predicate(
    "default sort returns sessions",
    defaultSorted.data.length >= 1,
  );
  // 2. Sort ascending by created_at (oldest first)
  const ascSorted = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        sort: "created_at",
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(ascSorted);
  TestValidator.predicate(
    "ascending sort returns sessions",
    ascSorted.data.length >= 1,
  );
  // 3. Sort descending by expired_at
  const expSorted = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        sort: "-expired_at",
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(expSorted);
  TestValidator.predicate(
    "expired_at sort returns sessions",
    expSorted.data.length >= 1,
  );
  // Get the first session for filtering tests
  const session = defaultSorted.data[0];
  const ipPrefix = session.ip.split(".").slice(0, 2).join(".");
  // ─── IP FILTERING TESTS ──────────────────────────────────
  // 4-5. Filter by matching IP substring
  const ipMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: ipPrefix,
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(ipMatch);
  TestValidator.predicate(
    "IP filter match returns session",
    ipMatch.data.length >= 1,
  );
  // 6. Filter by non-matching IP
  const ipNoMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: "999.999.999",
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(ipNoMatch);
  TestValidator.equals(
    "IP filter no match returns empty",
    ipNoMatch.data.length,
    0,
  );
  // ─── DATE RANGE FILTERING TESTS ──────────────────────────
  const sessionCreatedAt = new Date(session.created_at);
  const oneHourMs = 60 * 60 * 1000;
  // 7. created_at_from = 1 hour before session's created_at → session returned
  const fromMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: new Date(
          sessionCreatedAt.getTime() - oneHourMs,
        ).toISOString(),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(fromMatch);
  TestValidator.predicate(
    "created_at_from includes session",
    fromMatch.data.length >= 1,
  );
  // 8. created_at_from = future date → empty
  const fromNoMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_from: new Date(Date.now() + 24 * oneHourMs).toISOString(),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(fromNoMatch);
  TestValidator.equals(
    "created_at_from future returns empty",
    fromNoMatch.data.length,
    0,
  );
  // 9. created_at_to = 1 hour after session's created_at → session returned
  const toMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_to: new Date(
          sessionCreatedAt.getTime() + oneHourMs,
        ).toISOString(),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(toMatch);
  TestValidator.predicate(
    "created_at_to includes session",
    toMatch.data.length >= 1,
  );
  // 10. created_at_to = past date before session's created_at → empty
  const toNoMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_to: new Date(
          sessionCreatedAt.getTime() - 24 * oneHourMs,
        ).toISOString(),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(toNoMatch);
  TestValidator.equals(
    "created_at_to past returns empty",
    toNoMatch.data.length,
    0,
  );
  // ─── GENERAL SEARCH TESTS ────────────────────────────────
  // 11. Search by IP substring
  const searchIp = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        search: ipPrefix,
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(searchIp);
  TestValidator.predicate(
    "search by IP returns session",
    searchIp.data.length >= 1,
  );
  // 12. Search by href substring
  const searchHref = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        search: session.href.substring(0, Math.min(30, session.href.length)),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(searchHref);
  TestValidator.predicate(
    "search by href returns session",
    searchHref.data.length >= 1,
  );
  // 13. Search by non-matching term → empty
  const searchNoMatch =
    await api.functional.hrmTimeTracking.guest.sessions.index(guestConnection, {
      body: {
        search: "ZZZZZZZZZZZZZZZZZZ_UNMATCHABLE_ZZZZZZZZZZZZZZZZZZ",
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    });
  typia.assert(searchNoMatch);
  TestValidator.equals(
    "search no match returns empty",
    searchNoMatch.data.length,
    0,
  );
  // ─── PAGINATION TESTS ────────────────────────────────────
  // 14. page=1, limit=1
  const page1 = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination current", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 1);
  TestValidator.predicate(
    "pagination has records",
    page1.pagination.records >= 1,
  );
  TestValidator.predicate("pagination has pages", page1.pagination.pages >= 1);
  TestValidator.equals("page 1 data length", page1.data.length, 1);
  // 15. page=2, limit=1 (out of bounds)
  const page2 = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 1,
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 data empty", page2.data.length, 0);
  // ─── HREF AND REFERRER FILTERING TESTS ───────────────────
  // 16. Filter by href substring
  const hrefMatch = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    {
      body: {
        href: session.href.substring(0, Math.min(30, session.href.length)),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    },
  );
  typia.assert(hrefMatch);
  TestValidator.predicate(
    "href filter returns session",
    hrefMatch.data.length >= 1,
  );
  // 17. Filter by referrer substring
  const referrerMatch =
    await api.functional.hrmTimeTracking.guest.sessions.index(guestConnection, {
      body: {
        referrer: session.referrer.substring(
          0,
          Math.min(30, session.referrer.length),
        ),
      } satisfies IHrmTimeTrackingMemberSession.IRequest,
    });
  typia.assert(referrerMatch);
  TestValidator.predicate(
    "referrer filter returns session",
    referrerMatch.data.length >= 1,
  );
}
