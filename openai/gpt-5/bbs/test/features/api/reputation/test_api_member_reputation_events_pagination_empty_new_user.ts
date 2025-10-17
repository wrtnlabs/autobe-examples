import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEReputationEventSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEReputationEventSortBy";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussReputationEvent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconDiscussReputationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussReputationEvent";

/**
 * New member reputation ledger: empty pagination on narrow and broad date
 * ranges.
 *
 * Purpose
 *
 * - Ensure that a freshly registered (and authenticated) member can query their
 *   own reputation events list and receive an empty, well‑formed paginated
 *   response when no events exist.
 *
 * Why this matters
 *
 * - Reputation events are system-generated and a new account should not have any
 *   entries. The API must still return a correct pagination envelope and be
 *   filterable by a tight or broad date window.
 *
 * Steps
 *
 * 1. Register a new member (auto-auth via SDK) using /auth/member/join
 * 2. Query /econDiscuss/member/me/reputation/events with a tight date range around
 *    now and pagination (page=1, limit=20)
 * 3. Validate empty results and consistent pagination metadata
 * 4. Repeat with a broader date window to confirm stable empty results
 */
export async function test_api_member_reputation_events_pagination_empty_new_user(
  connection: api.IConnection,
) {
  // 1) Register a new member (auto-auth via SDK)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // >= 8 chars
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussMember.ICreate;

  const authorized = await api.functional.auth.member.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Prepare a tight date range window around now
  const now = new Date();
  const dateFromNarrow: string & tags.Format<"date-time"> = new Date(
    now.getTime() - 1_000,
  ).toISOString() as string & tags.Format<"date-time">;
  const dateToNarrow: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 1_000,
  ).toISOString() as string & tags.Format<"date-time">;

  const requestNarrow = {
    page: 1,
    limit: 20,
    dateFrom: dateFromNarrow,
    dateTo: dateToNarrow,
    sortBy: "occurred_at",
    sortOrder: "desc",
  } satisfies IEconDiscussReputationEvent.IRequest;

  const page1 =
    await api.functional.econDiscuss.member.me.reputation.events.index(
      connection,
      { body: requestNarrow },
    );
  typia.assert(page1);

  // 3) Validate empty results and consistent pagination metadata
  TestValidator.equals(
    "new member has no reputation events in narrow window",
    page1.data,
    [],
  );
  TestValidator.equals(
    "current page echoes request",
    page1.pagination.current,
    requestNarrow.page ?? 1,
  );
  TestValidator.equals(
    "limit echoes request",
    page1.pagination.limit,
    requestNarrow.limit ?? 20,
  );
  TestValidator.equals("no records for new user", page1.pagination.records, 0);
  TestValidator.equals("zero pages when no records", page1.pagination.pages, 0);

  // 4) Repeat with a broad date range (last 90 days to tomorrow)
  const dateFromWide: string & tags.Format<"date-time"> = new Date(
    now.getTime() - 90 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const dateToWide: string & tags.Format<"date-time"> = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const requestWide = {
    page: 1,
    limit: 20,
    dateFrom: dateFromWide,
    dateTo: dateToWide,
    sortBy: "occurred_at",
    sortOrder: "desc",
  } satisfies IEconDiscussReputationEvent.IRequest;

  const page2 =
    await api.functional.econDiscuss.member.me.reputation.events.index(
      connection,
      { body: requestWide },
    );
  typia.assert(page2);

  TestValidator.equals(
    "still empty with broad date range for brand-new user",
    page2.data,
    [],
  );
  TestValidator.equals(
    "current page echoes request (broad)",
    page2.pagination.current,
    requestWide.page ?? 1,
  );
  TestValidator.equals(
    "limit echoes request (broad)",
    page2.pagination.limit,
    requestWide.limit ?? 20,
  );
  TestValidator.equals(
    "no records for new user (broad)",
    page2.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages when no records (broad)",
    page2.pagination.pages,
    0,
  );
}
