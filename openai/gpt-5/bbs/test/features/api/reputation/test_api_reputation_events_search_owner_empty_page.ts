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
 * Validate owner-scoped search over reputation ledger returns a stable empty
 * page for a fresh member.
 *
 * Business flow:
 *
 * 1. Register a new member (join) and obtain authenticated context via SDK auto
 *    token handling.
 * 2. Search reputation events for the same member id with a time window around now
 *    → expect empty paginated result.
 * 3. Change filters to a future-only window → still empty and pagination stable.
 * 4. Auth boundary: unauthenticated connection should fail.
 * 5. Owner-only scope: using a mismatched userId should fail even when
 *    authenticated.
 */
export async function test_api_reputation_events_search_owner_empty_page(
  connection: api.IConnection,
) {
  // 1) Member registration and auth context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;
  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const userId = authorized.id; // string & tags.Format<"uuid">

  // Shared pagination parameters
  const page = 1 as number;
  const limit = 20 as number;

  // Time window including now
  const now = new Date();
  const windowFrom = new Date(now.getTime() - 60_000).toISOString();
  const windowTo = new Date(now.getTime() + 60_000).toISOString();

  // 2) Search own reputation events (expect empty)
  const searchBody1 = {
    page,
    limit,
    dateFrom: windowFrom,
    dateTo: windowTo,
  } satisfies IEconDiscussReputationEvent.IRequest;
  const page1: IPageIEconDiscussReputationEvent =
    await api.functional.econDiscuss.member.users.reputation.events.search(
      connection,
      {
        userId,
        body: searchBody1,
      },
    );
  typia.assert(page1);

  // Business assertions: empty and stable pagination
  TestValidator.equals(
    "first query should return empty data for new user",
    page1.data.length,
    0,
  );
  TestValidator.equals(
    "first query total records is 0",
    page1.pagination.records,
    0,
  );
  TestValidator.equals(
    "first query total pages is 0",
    page1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "first query limit echoes request",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "first query current page is non-negative",
    page1.pagination.current >= 0,
  );

  // 3) Out-of-window future filter (still empty)
  const futureFrom = new Date(
    now.getTime() + 365 * 24 * 60 * 60_000,
  ).toISOString();
  const futureTo = new Date(
    now.getTime() + 366 * 24 * 60 * 60_000,
  ).toISOString();
  const searchBody2 = {
    page,
    limit,
    dateFrom: futureFrom,
    dateTo: futureTo,
  } satisfies IEconDiscussReputationEvent.IRequest;
  const page2: IPageIEconDiscussReputationEvent =
    await api.functional.econDiscuss.member.users.reputation.events.search(
      connection,
      {
        userId,
        body: searchBody2,
      },
    );
  typia.assert(page2);

  TestValidator.equals(
    "future-window query remains empty",
    page2.data.length,
    0,
  );
  TestValidator.equals(
    "future-window records is 0",
    page2.pagination.records,
    0,
  );
  TestValidator.equals("future-window pages is 0", page2.pagination.pages, 0);
  TestValidator.equals(
    "future-window limit echoes request",
    page2.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "future-window current page is non-negative",
    page2.pagination.current >= 0,
  );

  // 4) Auth boundary: unauthenticated connection must error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated reputation search should fail",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.search(
        unauthConn,
        {
          userId,
          body: searchBody1,
        },
      );
    },
  );

  // 5) Owner-only scope: mismatched path userId must error
  const otherUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "owner-only scope blocks mismatched userId",
    async () => {
      await api.functional.econDiscuss.member.users.reputation.events.search(
        connection,
        {
          userId: otherUserId,
          body: searchBody1,
        },
      );
    },
  );
}
