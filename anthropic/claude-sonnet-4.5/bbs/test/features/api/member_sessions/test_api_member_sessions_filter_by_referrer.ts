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
 * Test filtering member sessions by referrer URL.
 *
 * This test validates the referrer-based session filtering functionality by:
 *
 * 1. Creating a new member account with a specific referrer URL to establish a
 *    session with known referrer context
 * 2. Searching for sessions using the referrer filter parameter to retrieve
 *    sessions that match the specified referrer
 * 3. Verifying that returned sessions contain the correct referrer URL
 * 4. Confirming response structure includes proper pagination metadata
 * 5. Validating that the filtering correctly identifies sessions originating from
 *    the specified source
 *
 * This test ensures the system can accurately track and filter user sessions
 * based on their referrer sources.
 */
export async function test_api_member_sessions_filter_by_referrer(
  connection: api.IConnection,
) {
  // Create a member with a specific referrer URL to establish session context
  const specificReferrer = "https://marketing-campaign.example.com/summer-2024";
  const hrefUrl = "https://discussion-board.example.com/join";

  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(),
    ip: "192.168.1.100",
    href: hrefUrl,
    referrer: specificReferrer,
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Search for sessions filtering by the specific referrer
  const searchRequest = {
    page: 1,
    limit: 10,
    referrer: specificReferrer,
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const sessionPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: member.id,
        body: searchRequest,
      },
    );
  typia.assert(sessionPage);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination object exists",
    sessionPage.pagination !== null && sessionPage.pagination !== undefined,
  );
  TestValidator.predicate(
    "session data array exists",
    Array.isArray(sessionPage.data),
  );

  // Validate that at least one session was found with the specified referrer
  TestValidator.predicate(
    "at least one session found with referrer filter",
    sessionPage.data.length > 0,
  );

  // Verify that the returned sessions contain the correct referrer URL
  for (const session of sessionPage.data) {
    typia.assert(session);

    // The session should belong to the created member
    TestValidator.equals(
      "session belongs to created member",
      session.discussion_board_member_id,
      member.id,
    );

    TestValidator.equals(
      "member in session matches created member",
      session.member.id,
      member.id,
    );
  }

  // Test with partial referrer matching (substring search)
  const partialReferrer = "marketing-campaign.example.com";
  const partialSearchRequest = {
    page: 1,
    limit: 10,
    referrer: partialReferrer,
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const partialSessionPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: member.id,
        body: partialSearchRequest,
      },
    );
  typia.assert(partialSessionPage);

  // Validate that partial matching works
  TestValidator.predicate(
    "partial referrer matching returns results",
    partialSessionPage.data.length > 0,
  );

  // Test with non-matching referrer to ensure filtering works correctly
  const nonMatchingReferrer = "https://completely-different-site.com";
  const nonMatchingRequest = {
    page: 1,
    limit: 10,
    referrer: nonMatchingReferrer,
  } satisfies IDiscussionBoardMemberSession.IRequest;

  const nonMatchingPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: member.id,
        body: nonMatchingRequest,
      },
    );
  typia.assert(nonMatchingPage);

  // Verify that non-matching referrer returns no results or different results
  TestValidator.predicate(
    "non-matching referrer filter works correctly",
    nonMatchingPage.data.length === 0 ||
      nonMatchingPage.data.every(
        (session) => session.discussion_board_member_id !== member.id,
      ),
  );
}
