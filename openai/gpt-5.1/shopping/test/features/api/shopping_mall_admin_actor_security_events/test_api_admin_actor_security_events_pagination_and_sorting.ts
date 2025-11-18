import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate pagination and sorting of admin actor security events.
 *
 * ## Business goal
 *
 * Ensure that the administrative search endpoint for actor security events
 * (PATCH /shoppingMall/admin/actorSecurityEvents) returns deterministic,
 * non-overlapping pages when sorted by created_at, and that switching sort
 * direction between desc and asc inverts the ordering as expected.
 *
 * ## High-level flow
 *
 * 1. Join an admin account using POST /auth/admin/join. The SDK helper
 *    automatically stores the returned access token in the connection headers,
 *    so all subsequent shoppingMall.admin.* calls are authorized.
 * 2. Create more than two pages worth of security events (e.g. 25 events for page
 *    size 10) using POST /shoppingMall/admin/actorSecurityEvents. Use
 *    actor_type = "admin" with varied event_type/ip/user_agent/metadata to
 *    ensure that there is enough realistic data but keep the values simple.
 *    Rely on the server to populate created_at timestamps upon insert.
 * 3. Call PATCH /shoppingMall/admin/actorSecurityEvents (index) with
 *    IShoppingMallActorSecurityEvent.IRequest specifying:
 *
 *    - Page = 1, limit = 10
 *    - Order_by = "created_at"
 *    - Order_direction = "desc" Capture the returned page of
 *         IShoppingMallActorSecurityEvent.ISummary.
 * 4. Call the same endpoint again with page = 2, same limit and sort options, and
 *    capture the second page.
 * 5. Validate business expectations:
 *
 *    - No event id appears in both page1 and page2.
 *    - The concatenation [page1, page2] is strictly ordered by created_at in
 *         descending order (monotonic non-increasing; if timestamps are equal,
 *         any tie-breaking order is accepted but still must not violate the
 *         non-increasing invariant).
 * 6. Repeat the pagination in ascending order:
 *
 *    - Call index with page = 1, limit = 10, order_by = "created_at",
 *         order_direction = "asc".
 *    - Call index with page = 2, same limit and options.
 *    - Validate that the concatenation [page1Asc, page2Asc] is ordered by created_at
 *         ascending (non-decreasing) and has no overlaps between page1Asc and
 *         page2Asc.
 *    - Additionally, for the common cardinality min(descUnion.length,
 *         ascUnion.length) (which should be at least 20 in this setup), verify
 *         that reversing the ascending union yields the same sequence of ids as
 *         the descending union for the first N items. This confirms that
 *         changing order_direction truly inverts ordering.
 */
export async function test_api_admin_actor_security_events_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join an admin and obtain authorized context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // satisfy password format without overcomplicating
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create more than two pages worth of security events
  const totalEvents = 25;
  const createdEvents: IShoppingMallActorSecurityEvent[] =
    await ArrayUtil.asyncRepeat(totalEvents, async (index) => {
      const body = {
        actor_type: "admin",
        event_type:
          index % 2 === 0 ? "LOGIN_FAILED" : "PASSWORD_RESET_REQUESTED",
        ip: index % 3 === 0 ? "127.0.0.1" : "192.168.0.1",
        user_agent: index % 4 === 0 ? "Mozilla/5.0" : "Chrome/120.0",
        metadata:
          index % 5 === 0
            ? JSON.stringify({ reason: "rate_limit", index })
            : JSON.stringify({ reason: "test", index }),
      } satisfies IShoppingMallActorSecurityEvent.ICreate;

      const created =
        await api.functional.shoppingMall.admin.actorSecurityEvents.create(
          connection,
          { body },
        );
      typia.assert(created);
      return created;
    });

  TestValidator.equals(
    "created events count should match requested total",
    createdEvents.length,
    totalEvents,
  );

  // Helper to assert ordering by created_at
  const assertSortedByCreatedAt = (
    title: string,
    data: IShoppingMallActorSecurityEvent.ISummary[],
    direction: "asc" | "desc",
  ) => {
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();

      if (direction === "asc") {
        TestValidator.predicate(
          `${title} - ascending created_at at index ${i}`,
          currTime >= prevTime,
        );
      } else {
        TestValidator.predicate(
          `${title} - descending created_at at index ${i}`,
          currTime <= prevTime,
        );
      }
    }
  };

  // Helper to assert that two pages have no overlapping ids
  const assertNoOverlap = (
    title: string,
    first: IShoppingMallActorSecurityEvent.ISummary[],
    second: IShoppingMallActorSecurityEvent.ISummary[],
  ) => {
    const firstIds = new Set(first.map((e) => e.id));
    const overlap = second.filter((e) => firstIds.has(e.id));
    TestValidator.equals(
      `${title} - overlapping ids should be zero`,
      overlap.length,
      0,
    );
  };

  // 3–5. Descending pagination: page 1 & page 2
  const descPage1 =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IShoppingMallActorSecurityEvent.IRequest,
      },
    );
  typia.assert(descPage1);

  const descPage2 =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IShoppingMallActorSecurityEvent.IRequest,
      },
    );
  typia.assert(descPage2);

  // Ensure basic pagination metadata alignment
  TestValidator.equals(
    "desc page1 current page should be 1",
    descPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "desc page2 current page should be 2",
    descPage2.pagination.current,
    2,
  );

  // Validate non-overlapping ids between first two pages
  assertNoOverlap("desc pagination", descPage1.data, descPage2.data);

  // Desc union ordering check
  const descUnion = [...descPage1.data, ...descPage2.data];
  assertSortedByCreatedAt(
    "desc union should be sorted by created_at desc",
    descUnion,
    "desc",
  );

  // 6. Ascending pagination: page 1 & page 2
  const ascPage1 =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IShoppingMallActorSecurityEvent.IRequest,
      },
    );
  typia.assert(ascPage1);

  const ascPage2 =
    await api.functional.shoppingMall.admin.actorSecurityEvents.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IShoppingMallActorSecurityEvent.IRequest,
      },
    );
  typia.assert(ascPage2);

  TestValidator.equals(
    "asc page1 current page should be 1",
    ascPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "asc page2 current page should be 2",
    ascPage2.pagination.current,
    2,
  );

  assertNoOverlap("asc pagination", ascPage1.data, ascPage2.data);

  const ascUnion = [...ascPage1.data, ...ascPage2.data];
  assertSortedByCreatedAt(
    "asc union should be sorted by created_at asc",
    ascUnion,
    "asc",
  );

  // Symmetry check between asc and desc sequences
  const comparableLength = Math.min(descUnion.length, ascUnion.length);
  const truncatedDesc = descUnion.slice(0, comparableLength);
  const truncatedAscReversed = ascUnion
    .slice(0, comparableLength)
    .slice()
    .reverse();

  for (let i = 0; i < comparableLength; i++) {
    TestValidator.equals(
      `symmetry check - id at symmetric index ${i} should match`,
      truncatedDesc[i].id,
      truncatedAscReversed[i].id,
    );
  }
}
