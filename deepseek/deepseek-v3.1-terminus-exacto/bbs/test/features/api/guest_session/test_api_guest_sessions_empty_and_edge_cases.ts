import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_empty_and_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test 1: Empty database scenario
  const emptySearch = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals("empty data array", emptySearch.data.length, 0);
  TestValidator.equals("zero records", emptySearch.pagination.records, 0);
  TestValidator.equals("zero pages", emptySearch.pagination.pages, 0);
  TestValidator.equals("current page 1", emptySearch.pagination.current, 1);
  TestValidator.equals("limit 10", emptySearch.pagination.limit, 10);
  // Test 2: Filtering with non-matching parameters using random valid data
  const nonMatchingSearch =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching data empty",
    nonMatchingSearch.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching records zero",
    nonMatchingSearch.pagination.records,
    0,
  );
  // Test 3: Date boundary conditions
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
  const futureSearch =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        created_at: futureDate satisfies string & tags.Format<"date-time">,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(futureSearch);
  TestValidator.equals("future date empty", futureSearch.data.length, 0);
  const pastSearch = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        expired_at: pastDate satisfies string & tags.Format<"date-time">,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(pastSearch);
  // Test 4: Maximum limit values with proper type conversion
  const maxLimitSearch =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
        >() satisfies number as number,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "max limit valid",
    maxLimitSearch.pagination.limit <= 1000,
  );
  // Test 5: Pagination consistency
  const paginationTest =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        page: 2,
        limit: 20,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination structure consistent",
    typeof paginationTest.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination structure consistent",
    typeof paginationTest.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination structure consistent",
    typeof paginationTest.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination structure consistent",
    typeof paginationTest.pagination.pages,
    "number",
  );
}
