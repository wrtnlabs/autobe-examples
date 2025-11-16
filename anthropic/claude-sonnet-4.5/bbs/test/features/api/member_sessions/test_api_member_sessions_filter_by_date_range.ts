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
 * Test filtering member sessions by creation date range.
 *
 * This test validates the temporal filtering capability where members can
 * review sessions from specific time periods for security audits and
 * investigating suspicious activity during particular timeframes.
 *
 * Steps:
 *
 * 1. Create a new member account via join (establishes initial session)
 * 2. Capture the current timestamp for date range reference
 * 3. Search for sessions using created_after and created_before parameters
 * 4. Verify all returned sessions have created_at within the specified range
 * 5. Confirm response structure and pagination metadata are correct
 */
export async function test_api_member_sessions_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to establish a session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name();

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Capture current timestamp and define date range
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Step 3: Search for sessions within the date range
  const sessionsPage: IPageIDiscussionBoardMemberSession.ISummary =
    await api.functional.discussionBoard.member.members.sessions.index(
      connection,
      {
        memberId: createdMember.id,
        body: {
          created_after: oneHourAgo.toISOString(),
          created_before: oneHourLater.toISOString(),
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(sessionsPage);

  // Step 4: Verify all returned sessions fall within the specified date range
  const createdAfterTime = oneHourAgo.getTime();
  const createdBeforeTime = oneHourLater.getTime();

  for (const session of sessionsPage.data) {
    const sessionCreatedAt = new Date(session.created_at).getTime();

    TestValidator.predicate(
      "session created_at is after the specified created_after timestamp",
      sessionCreatedAt >= createdAfterTime,
    );

    TestValidator.predicate(
      "session created_at is before the specified created_before timestamp",
      sessionCreatedAt <= createdBeforeTime,
    );
  }

  // Step 5: Verify response structure and pagination metadata
  TestValidator.predicate(
    "response contains pagination metadata",
    sessionsPage.pagination !== null && sessionsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "response contains data array",
    Array.isArray(sessionsPage.data),
  );

  // Verify that at least the session created during join exists
  TestValidator.predicate(
    "at least one session exists (from member join)",
    sessionsPage.data.length >= 1,
  );
}
