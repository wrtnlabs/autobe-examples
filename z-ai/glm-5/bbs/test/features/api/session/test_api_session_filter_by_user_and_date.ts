import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSessionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSessionStatus";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test filtering sessions by user ID and creation date range.
 *
 * 1. User authenticates via join, creating a session
 * 2. Query sessions with user ID filter
 * 3. Query sessions with date range filter
 * 4. Validate filtering, pagination, and sorting functionality
 */
export async function test_api_session_filter_by_user_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const beforeJoin = new Date().toISOString();
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  const afterJoin = new Date().toISOString();
  const userId = authorized.id;
  // 2. Query sessions filtered by user ID
  const userSessions = await api.functional.discussionBoard.user.sessions.index(
    userConnection,
    {
      body: {
        discussion_board_user_id: userId,
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(userSessions);
  // 3. Validate: All sessions belong to the user
  TestValidator.predicate(
    "all sessions belong to the user",
    userSessions.data.every((session) => session.user.id === userId),
  );
  // 4. Validate: User's session appears in results
  TestValidator.predicate(
    "user's session appears in filtered results",
    userSessions.data.length >= 1,
  );
  // 5. Query sessions filtered by date range
  const dateFilteredSessions =
    await api.functional.discussionBoard.user.sessions.index(userConnection, {
      body: {
        discussion_board_user_id: userId,
        created_at_from: beforeJoin,
        created_at_to: afterJoin,
      } satisfies IDiscussionBoardUserSession.IRequest,
    });
  typia.assert(dateFilteredSessions);
  // 6. Validate: All sessions are within date range
  TestValidator.predicate(
    "all sessions within date range",
    dateFilteredSessions.data.every((session) => {
      const createdAt = new Date(session.created_at).getTime();
      return (
        createdAt >= new Date(beforeJoin).getTime() &&
        createdAt <= new Date(afterJoin).getTime()
      );
    }),
  );
  // 7. Validate: User's session appears in date-filtered results
  TestValidator.predicate(
    "user's session appears in date-filtered results",
    dateFilteredSessions.data.length >= 1,
  );
  // 8. Test pagination - first page
  const firstPage = await api.functional.discussionBoard.user.sessions.index(
    userConnection,
    {
      body: {
        discussion_board_user_id: userId,
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(firstPage);
  // 9. Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 1", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "first page has at most 1 item",
    firstPage.data.length <= 1,
  );
  // 10. Test sorting ascending
  const sortedAsc = await api.functional.discussionBoard.user.sessions.index(
    userConnection,
    {
      body: {
        discussion_board_user_id: userId,
        sort: "created_at-asc",
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(sortedAsc);
  // 11. Validate ascending order
  if (sortedAsc.data.length >= 2) {
    TestValidator.predicate(
      "sessions sorted ascending by created_at",
      sortedAsc.data.every((session, index) => {
        if (index === 0) return true;
        const prev = new Date(sortedAsc.data[index - 1].created_at).getTime();
        const curr = new Date(session.created_at).getTime();
        return prev <= curr;
      }),
    );
  }
  // 12. Test sorting descending
  const sortedDesc = await api.functional.discussionBoard.user.sessions.index(
    userConnection,
    {
      body: {
        discussion_board_user_id: userId,
        sort: "created_at-desc",
      } satisfies IDiscussionBoardUserSession.IRequest,
    },
  );
  typia.assert(sortedDesc);
  // 13. Validate descending order
  if (sortedDesc.data.length >= 2) {
    TestValidator.predicate(
      "sessions sorted descending by created_at",
      sortedDesc.data.every((session, index) => {
        if (index === 0) return true;
        const prev = new Date(sortedDesc.data[index - 1].created_at).getTime();
        const curr = new Date(session.created_at).getTime();
        return prev >= curr;
      }),
    );
  }
}
