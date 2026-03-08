import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test guest session filtering by various criteria.
 *
 * This test validates the administrator's ability to filter guest sessions
 * using multiple criteria including session type, IP address, date ranges,
 * and expiration status. The test ensures that:
 * 1. Single filter criteria work correctly
 * 2. Multiple filter combinations work together
 * 3. Pagination metadata reflects filtered results accurately
 * 4. Empty result sets return proper metadata
 */
export async function test_api_guest_session_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create multiple guest sessions with different attributes for filtering
  const guestIp1 = typia.random<string & tags.Format<"ipv4">>();
  const guestIp2 = typia.random<string & tags.Format<"ipv4">>();
  const guestIp3 = typia.random<string & tags.Format<"ipv4">>();
  const createdAt1 = new Date().toISOString();
  const createdAt2 = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour later
  const createdAt3 = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(); // 2 hours later
  // Create first guest session
  const session1 = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        ip: guestIp1,
        created_at_from: createdAt1,
        created_at_to: createdAt2,
        expired: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(session1);
  // Create second guest session with different IP
  const session2 = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        ip: guestIp2,
        created_at_from: createdAt2,
        created_at_to: createdAt3,
        expired: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(session2);
  // Create third guest session
  const session3 = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        ip: guestIp3,
        created_at_from: createdAt1,
        created_at_to: createdAt3,
        expired: false,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(session3);
  // 3. Test filtering by session type
  const filteredByType =
    await api.functional.discussionBoard.admin.guests.index(adminConnection, {
      body: {
        session_type: "guest",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(filteredByType);
  TestValidator.equals(
    "session type filter returns guest sessions",
    filteredByType.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "all returned sessions are guest type",
    filteredByType.data.every((s) => s.type === "guest"),
  );
  // 4. Test filtering by IP address
  const filteredByIp = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        ip: guestIp1,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(filteredByIp);
  TestValidator.predicate(
    "IP filter returns matching sessions",
    filteredByIp.data.every((s) => s.ip === guestIp1),
  );
  // 5. Test filtering by date range
  const filteredByDate =
    await api.functional.discussionBoard.admin.guests.index(adminConnection, {
      body: {
        session_type: "guest",
        created_at_from: createdAt1,
        created_at_to: createdAt2,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(filteredByDate);
  TestValidator.predicate(
    "date range filter returns sessions within range",
    filteredByDate.data.every(
      (s) => s.created_at >= createdAt1 && s.created_at <= createdAt2,
    ),
  );
  // 6. Test combined filters (IP + date range)
  const filteredCombined =
    await api.functional.discussionBoard.admin.guests.index(adminConnection, {
      body: {
        session_type: "guest",
        ip: guestIp1,
        created_at_from: createdAt1,
        created_at_to: createdAt3,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(filteredCombined);
  TestValidator.predicate(
    "combined filters return matching sessions",
    filteredCombined.data.every(
      (s) =>
        s.ip === guestIp1 &&
        s.created_at >= createdAt1 &&
        s.created_at <= createdAt3,
    ),
  );
  // 7. Test pagination metadata
  TestValidator.equals(
    "pagination current page",
    filteredByType.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    filteredByType.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    filteredByType.pagination.records >= filteredByType.data.length,
  );
  // 8. Test empty result set
  const nonExistentIp = "999.999.999.999";
  const emptyResult = await api.functional.discussionBoard.admin.guests.index(
    adminConnection,
    {
      body: {
        session_type: "guest",
        ip: nonExistentIp,
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result returns zero records",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records is zero",
    emptyResult.pagination.records,
    0,
  );
  // 9. Test sorting by created_at
  const sortedByCreatedAt =
    await api.functional.discussionBoard.admin.guests.index(adminConnection, {
      body: {
        session_type: "guest",
        sort_by: "created_at",
        order: "desc",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(sortedByCreatedAt);
  if (sortedByCreatedAt.data.length > 1) {
    TestValidator.predicate(
      "sessions sorted by created_at descending",
      sortedByCreatedAt.data.every(
        (s, i) =>
          i === 0 || s.created_at <= sortedByCreatedAt.data[i - 1].created_at,
      ),
    );
  }
}
