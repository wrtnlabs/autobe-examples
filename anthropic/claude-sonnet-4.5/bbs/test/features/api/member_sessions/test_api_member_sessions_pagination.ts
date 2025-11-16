import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";

/**
 * Test pagination functionality for member session lists.
 *
 * This scenario validates pagination controls by:
 *
 * 1. Creating a new member account via join
 * 2. Searching for sessions with specific page and limit parameters
 * 3. Verifying the pagination metadata includes correct current page, limit, total
 *    records, and total pages
 * 4. Confirming the data array respects the specified limit
 * 5. Validating that pagination calculations are mathematically consistent (pages
 *    = ceil(records / limit))
 *
 * This tests the pagination implementation that enables efficient navigation
 * through large session lists without overwhelming the client or server.
 */
export async function test_api_member_sessions_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to generate at least one session
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authorizedMember);

  // Step 2: Search for sessions with fixed pagination parameters
  const pageNumber = 1;
  const limitNumber = 10;

  const searchRequest = {
    page: pageNumber,
    limit: limitNumber,
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const paginatedSessions: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: authorizedMember.id,
        body: searchRequest,
      },
    );
  typia.assert(paginatedSessions);

  // Step 3: Verify pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    paginatedSessions.pagination !== null &&
      paginatedSessions.pagination !== undefined,
  );

  const pagination: IPage.IPagination = paginatedSessions.pagination;
  typia.assert(pagination);

  // Step 4: Verify pagination metadata values
  TestValidator.equals(
    "current page matches request",
    pagination.current,
    pageNumber,
  );

  TestValidator.equals("limit matches request", pagination.limit, limitNumber);

  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);

  // Step 5: Verify data array respects the limit
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginatedSessions.data.length <= pagination.limit,
  );

  // Step 6: Validate pagination calculation consistency (pages = ceil(records / limit))
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;

  TestValidator.equals(
    "pages calculation is mathematically consistent",
    pagination.pages,
    expectedPages,
  );

  // Step 7: Verify that if records > 0 and limit > 0, then pages > 0
  if (pagination.records > 0 && pagination.limit > 0) {
    TestValidator.predicate(
      "pages is positive when records exist and limit is positive",
      pagination.pages > 0,
    );
  }

  // Step 8: Verify each session in the data array has valid structure
  if (paginatedSessions.data.length > 0) {
    for (const session of paginatedSessions.data) {
      typia.assert(session);

      TestValidator.equals(
        "session belongs to the requesting member",
        session.discussion_board_member_id,
        authorizedMember.id,
      );
    }
  }
}
