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
 * Test sorting member sessions by creation time in descending order (newest
 * first).
 *
 * This test validates the default sort order for security monitoring by:
 *
 * 1. Creating a new member account via join
 * 2. Searching for sessions with sort parameter set to '-created_at'
 * 3. Verifying that sessions are ordered from newest to oldest based on created_at
 *    timestamps
 * 4. Confirming that the most recent session appears first in the results
 * 5. Validating the pagination metadata reflects the correct total count
 *
 * This tests the recommended default sort order that shows the most recent
 * login activity first, which is most useful for security monitoring and
 * identifying current active sessions.
 */
export async function test_api_member_sessions_sort_by_created_at_descending(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const createData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createData,
    });
  typia.assert(member);

  // Step 2: Search for sessions with descending sort by created_at
  const searchRequest = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const sessionsPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: member.id,
        body: searchRequest,
      },
    );
  typia.assert(sessionsPage);

  // Step 3: Verify pagination metadata
  TestValidator.predicate(
    "sessions page should have data",
    sessionsPage.data.length > 0,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    sessionsPage.pagination.current,
    1,
  );

  TestValidator.predicate(
    "total records should be at least 1",
    sessionsPage.pagination.records >= 1,
  );

  // Step 4: Verify sessions are sorted in descending order by created_at
  if (sessionsPage.data.length > 1) {
    for (let i = 0; i < sessionsPage.data.length - 1; i++) {
      const currentSession = sessionsPage.data[i];
      const nextSession = sessionsPage.data[i + 1];

      typia.assert(currentSession);
      typia.assert(nextSession);

      const currentTimestamp = new Date(currentSession.created_at).getTime();
      const nextTimestamp = new Date(nextSession.created_at).getTime();

      TestValidator.predicate(
        `session at index ${i} should be newer than session at index ${i + 1}`,
        currentTimestamp >= nextTimestamp,
      );
    }
  }

  // Step 5: Verify the most recent session appears first
  const firstSession = sessionsPage.data[0];
  typia.assert(firstSession);

  TestValidator.equals(
    "first session member ID should match",
    firstSession.discussion_board_member_id,
    member.id,
  );
}
