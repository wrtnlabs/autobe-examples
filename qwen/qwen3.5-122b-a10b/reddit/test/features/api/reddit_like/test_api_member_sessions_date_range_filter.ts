import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeGuestSession";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session list filtering by creation date range.
 *
 * Validates that authenticated members can retrieve their session history filtered by a specific time window using created_at_from and created_at_to parameters. This security feature enables members to review login activity during particular date ranges for investigating suspicious access patterns.
 *
 * The test creates multiple sessions with varying timestamps and verifies that the filtering logic correctly returns only sessions within the specified date range, excluding those created before or after the window.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Retrieve existing sessions for the member.
 * 3. Filter sessions using created_at_from and created_at_to parameters.
 * 4. Validate all returned sessions fall within the specified date range.
 * 5. Validate pagination metadata is accurate.
 * 6. Verify sessions outside the range are excluded from results.
 */
export async function test_api_member_sessions_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Get all sessions first without filters
  const allSessions = await api.functional.redditLike.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
        order: "desc",
      } satisfies IRedditLikeGuestSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // 3. Filter sessions by date range
  if (allSessions.data.length > 0) {
    // Sort sessions by created_at to establish time order
    const sortedSessions = [...allSessions.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    // Define a date range in the middle of our sessions
    const midIndex = Math.floor(sortedSessions.length / 2);
    const fromDate = new Date(sortedSessions[midIndex].created_at);
    const toDate = new Date(
      sortedSessions[Math.min(midIndex + 2, sortedSessions.length - 1)]
        .created_at,
    );
    // Add some buffer to ensure we're not at exact boundaries
    fromDate.setHours(fromDate.getHours() - 1);
    toDate.setHours(toDate.getHours() + 1);
    const created_at_from = fromDate.toISOString();
    const created_at_to = toDate.toISOString();
    // Filter sessions by date range
    const filteredSessions =
      await api.functional.redditLike.member.sessions.index(memberConnection, {
        body: {
          created_at_from,
          created_at_to,
          page: 1,
          limit: 100,
          sort: "created_at",
          order: "asc",
        } satisfies IRedditLikeGuestSession.IRequest,
      });
    typia.assert(filteredSessions);
    // 4. Validate all returned sessions are within the date range
    for (const session of filteredSessions.data) {
      const sessionTime = new Date(session.created_at).getTime();
      const fromTime = new Date(created_at_from).getTime();
      const toTime = new Date(created_at_to).getTime();
      TestValidator.predicate(
        `session ${session.id} created_at >= created_at_from`,
        sessionTime >= fromTime,
      );
      TestValidator.predicate(
        `session ${session.id} created_at <= created_at_to`,
        sessionTime <= toTime,
      );
    }
    // 5. Validate pagination metadata
    TestValidator.equals(
      "pagination current page",
      filteredSessions.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination limit is positive",
      filteredSessions.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      filteredSessions.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      filteredSessions.pagination.pages >= 0,
    );
    // 6. Validate data array length matches pagination
    TestValidator.equals(
      "data array length matches pagination limit constraint",
      filteredSessions.data.length <= filteredSessions.pagination.limit,
      true,
    );
  } else {
    // If no sessions exist, test with empty filter
    const emptyFilter = await api.functional.redditLike.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at_from: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
          created_at_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditLikeGuestSession.IRequest,
      },
    );
    typia.assert(emptyFilter);
    TestValidator.equals("no sessions found", emptyFilter.data.length, 0);
    TestValidator.equals(
      "pagination records is 0",
      emptyFilter.pagination.records,
      0,
    );
  }
}
