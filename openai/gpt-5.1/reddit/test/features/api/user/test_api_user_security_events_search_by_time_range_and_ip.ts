import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSecurityEvent";

/**
 * Validate filtering and pagination of user security events by time range and
 * IP.
 *
 * Business flow implemented:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated session.
 * 2. Create at least one account status via POST
 *    /communityPlatform/platformAdmin/accountStatuses to ensure the master
 *    catalog exists for related security events.
 * 3. Define a stable time window [created_from, created_to] covering the last 24
 *    hours.
 * 4. Choose an IP filter substring and call PATCH
 *    /communityPlatform/platformAdmin/userSecurityEvents with an
 *    ICommunityPlatformUserSecurityEvent.IRequest including
 *    created_from/created_to, ip, page, pageSize, sort_by="created_at", and
 *    sort_direction="asc".
 * 5. Assert that the response type matches
 *    IPageICommunityPlatformUserSecurityEvent.ISummary and that pagination
 *    metadata is coherent (current, limit, records, pages).
 * 6. When events are returned, validate that:
 *
 *    - All occurred_at values are within the requested time window.
 *    - If any event's ip_address contains the filter substring, then all events with
 *         ip_address also contain that substring (IP filter actually
 *         constrained the set).
 *    - Events are sorted ascending by occurred_at.
 * 7. If there are at least two pages, request page=2 with the same filters and
 *    validate that pagination metadata is consistent with page 1 and that page
 *    2 events respect the same filtering and sorting rules.
 */
export async function test_api_user_security_events_search_by_time_range_and_ip(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated connection
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create an account status entry to ensure catalog exists
  const statusKey = `ACTIVE_${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const statusCreateBody = {
    key: statusKey,
    label: "Active (auto-generated in test)",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      { body: statusCreateBody },
    );
  typia.assert<ICommunityPlatformAccountStatus>(createdStatus);

  // 3. Define time window for filtering (last 24 hours)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const toDate = now;
  const createdFrom = fromDate.toISOString();
  const createdTo = toDate.toISOString();

  // 4. Choose IP filter substring (cannot guarantee matches, but can assert semantics when it does)
  const ipFilter = "192.0.2.";

  // 5. Call userSecurityEvents.index for page 1
  const requestPage = 1;
  const requestPageSize = 5;

  const requestBodyPage1 = {
    ip: ipFilter,
    created_from: createdFrom,
    created_to: createdTo,
    page: requestPage,
    pageSize: requestPageSize,
    sort_by: "created_at",
    sort_direction: "asc",
  } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

  const page1 =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
      connection,
      { body: requestBodyPage1 },
    );
  typia.assert<IPageICommunityPlatformUserSecurityEvent.ISummary>(page1);

  const pagination1 = page1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  // Basic pagination invariants
  TestValidator.equals(
    "page 1 current index should be 1",
    pagination1.current,
    1,
  );
  TestValidator.predicate(
    "page 1 limit must be non-negative",
    pagination1.limit >= 0,
  );
  TestValidator.predicate(
    "records count must be non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "pages count must be non-negative",
    pagination1.pages >= 0,
  );
  TestValidator.predicate(
    "data length must not exceed limit when limit > 0",
    pagination1.limit === 0 || page1.data.length <= pagination1.limit,
  );

  // 6. Validate page 1 items respect time window, IP filter (when applicable), and ascending sort
  const eventsPage1 = page1.data;
  if (eventsPage1.length > 0) {
    // Determine whether any event's ip_address actually matches the filter substring
    const anyIpMatchesFilter = eventsPage1.some(
      (ev) => ev.ip_address !== undefined && ev.ip_address.includes(ipFilter),
    );

    for (const ev of eventsPage1) {
      typia.assert<ICommunityPlatformUserSecurityEvent.ISummary>(ev);

      // Time window invariants
      TestValidator.predicate(
        "occurred_at should be >= created_from",
        ev.occurred_at >= createdFrom,
      );
      TestValidator.predicate(
        "occurred_at should be <= created_to",
        ev.occurred_at <= createdTo,
      );

      // IP filter invariants: only enforce strict matching when we know at least one match exists
      if (anyIpMatchesFilter && ev.ip_address !== undefined) {
        TestValidator.predicate(
          "when at least one event matches the IP filter, all ip_address values should include the filter",
          ev.ip_address.includes(ipFilter),
        );
      }
    }

    // Ascending sort check by occurred_at
    for (let i = 1; i < eventsPage1.length; ++i) {
      const prev = eventsPage1[i - 1];
      const curr = eventsPage1[i];
      TestValidator.predicate(
        "events should be sorted ascending by occurred_at on page 1",
        prev.occurred_at <= curr.occurred_at,
      );
    }
  }

  // 7. If multiple pages exist, fetch page 2 and validate pagination and ordering semantics
  if (pagination1.pages >= 2) {
    const requestBodyPage2 = {
      ip: ipFilter,
      created_from: createdFrom,
      created_to: createdTo,
      page: 2,
      pageSize: requestPageSize,
      sort_by: "created_at",
      sort_direction: "asc",
    } satisfies ICommunityPlatformUserSecurityEvent.IRequest;

    const page2 =
      await api.functional.communityPlatform.platformAdmin.userSecurityEvents.index(
        connection,
        { body: requestBodyPage2 },
      );
    typia.assert<IPageICommunityPlatformUserSecurityEvent.ISummary>(page2);

    const pagination2 = page2.pagination;
    typia.assert<IPage.IPagination>(pagination2);

    TestValidator.equals(
      "page 2 current index should be 2",
      pagination2.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should equal page 1 limit",
      pagination2.limit,
      pagination1.limit,
    );
    TestValidator.predicate(
      "page 2 records should match page 1 records",
      pagination2.records === pagination1.records,
    );
    TestValidator.predicate(
      "page 2 pages should match page 1 pages",
      pagination2.pages === pagination1.pages,
    );
    TestValidator.predicate(
      "page 2 data length must not exceed limit when limit > 0",
      pagination2.limit === 0 || page2.data.length <= pagination2.limit,
    );

    const eventsPage2 = page2.data;
    if (eventsPage2.length > 0) {
      const anyIpMatchesFilterPage2 = eventsPage2.some(
        (ev) => ev.ip_address !== undefined && ev.ip_address.includes(ipFilter),
      );

      for (const ev of eventsPage2) {
        typia.assert<ICommunityPlatformUserSecurityEvent.ISummary>(ev);

        TestValidator.predicate(
          "page 2 occurred_at should be >= created_from",
          ev.occurred_at >= createdFrom,
        );
        TestValidator.predicate(
          "page 2 occurred_at should be <= created_to",
          ev.occurred_at <= createdTo,
        );

        if (anyIpMatchesFilterPage2 && ev.ip_address !== undefined) {
          TestValidator.predicate(
            "on page 2, when at least one event matches the IP filter, all ip_address values should include the filter",
            ev.ip_address.includes(ipFilter),
          );
        }
      }

      for (let i = 1; i < eventsPage2.length; ++i) {
        const prev = eventsPage2[i - 1];
        const curr = eventsPage2[i];
        TestValidator.predicate(
          "events should be sorted ascending by occurred_at on page 2",
          prev.occurred_at <= curr.occurred_at,
        );
      }
    }
  }
}
