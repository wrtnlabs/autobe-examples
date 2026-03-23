import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the session listing functionality with advanced filtering capabilities.
 *
 * 1. Register a new guest account using authorize_guest_join utility function
 * 2. Create multiple guest sessions with different characteristics
 * 3. Call PATCH /redditClone/guest/sessions with various filter parameters
 * 4. Verify pagination metadata and filtered results
 * 5. Test edge cases including empty results and partial matches
 */
export async function test_api_guest_session_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account and get authenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create additional sessions with different characteristics
  // Session with Windows user agent
  const session1Connection: api.IConnection = { host: connection.host };
  await authorize_guest_join(session1Connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: "192.168.1.100",
      user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  // Session with Mac user agent
  const session2Connection: api.IConnection = { host: connection.host };
  await authorize_guest_join(session2Connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: "192.168.1.101",
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  // Session with mobile user agent
  const session3Connection: api.IConnection = { host: connection.host };
  await authorize_guest_join(session3Connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: "10.0.0.50",
      user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  // 3. Test filtering by IP address (partial match)
  const ipFilterResult = await api.functional.redditClone.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: "192.168.1",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(ipFilterResult);
  TestValidator.predicate(
    "IP filter returns matching sessions",
    ipFilterResult.data.length >= 2,
  );
  TestValidator.equals(
    "pagination current page",
    ipFilterResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", ipFilterResult.pagination.limit, 20);
  // 4. Test filtering by user agent pattern
  const userAgentFilterResult =
    await api.functional.redditClone.guest.sessions.index(guestConnection, {
      body: {
        user_agent: "Windows",
        page: 1,
        limit: 10,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(userAgentFilterResult);
  TestValidator.predicate(
    "User agent filter returns Windows sessions",
    userAgentFilterResult.data.length >= 1,
  );
  TestValidator.equals(
    "custom limit applied",
    userAgentFilterResult.pagination.limit,
    10,
  );
  // 5. Test pagination with custom page and limit
  const paginationResult =
    await api.functional.redditClone.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        limit: 2,
        sort: "created_at desc",
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data array respects limit",
    paginationResult.data.length <= 2,
  );
  // 6. Test empty result set with non-matching IP filter
  const emptyResult = await api.functional.redditClone.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: "999.999.999.999",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals(
    "empty result data array length",
    emptyResult.data.length,
    0,
  );
  // 7. Test date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const dateRangeResult = await api.functional.redditClone.guest.sessions.index(
    guestConnection,
    {
      body: {
        created_at_start: pastDate.toISOString(),
        created_at_end: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns sessions",
    dateRangeResult.data.length >= 1,
  );
  // 8. Test sorting by created_at ascending
  const sortAscResult = await api.functional.redditClone.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at asc",
      } satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(sortAscResult);
  TestValidator.predicate(
    "sorted results returned",
    sortAscResult.data.length >= 1,
  );
  // 9. Test status filter for active sessions
  const activeStatusResult =
    await api.functional.redditClone.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(activeStatusResult);
  TestValidator.predicate(
    "active sessions returned",
    activeStatusResult.data.length >= 1,
  );
  // 10. Verify all returned sessions have member information
  TestValidator.predicate(
    "all sessions have member information",
    activeStatusResult.data.every((session) => session.member !== undefined),
  );
  // 11. Test custom page number
  const customPageResult =
    await api.functional.redditClone.guest.sessions.index(guestConnection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditCloneMemberSession.IRequest,
    });
  typia.assert(customPageResult);
  TestValidator.equals(
    "custom page number",
    customPageResult.pagination.current,
    2,
  );
  TestValidator.equals("custom limit", customPageResult.pagination.limit, 10);
}
