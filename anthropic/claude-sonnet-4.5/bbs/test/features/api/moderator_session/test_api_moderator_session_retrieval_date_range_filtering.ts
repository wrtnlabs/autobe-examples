import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratorSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratorSession";

/**
 * Test moderator session retrieval with precise date range filtering for
 * security audits and compliance reporting.
 *
 * This scenario validates the created_after and created_before filters work
 * correctly to retrieve sessions within specific time windows. Since the API
 * only provides join (registration) endpoint and each join creates one session
 * per moderator, we create multiple moderators at different time points and
 * validate that date range filtering works correctly across these sessions.
 *
 * This is critical for security monitoring workflows where administrators need
 * to review login activity during specific time periods for incident
 * investigation or compliance audits.
 *
 * Test Process:
 *
 * 1. Capture baseline timestamp before creating any moderators
 * 2. Create first moderator and capture its timestamp
 * 3. Wait for time separation
 * 4. Create second moderator and capture its timestamp
 * 5. Wait for time separation
 * 6. Create third moderator and capture its timestamp
 * 7. Test created_after filter: retrieve sessions created after a specific
 *    timestamp
 * 8. Test created_before filter: retrieve sessions created before a specific
 *    timestamp
 * 9. Test combined filters: retrieve sessions within a bounded date range
 * 10. Verify filtering logic correctly includes/excludes sessions based on
 *     created_at timestamp
 */
export async function test_api_moderator_session_retrieval_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Capture baseline timestamp before creating any moderators
  const baselineTimestamp = new Date();

  // Step 2: Create first moderator account
  const firstModeratorEmail = typia.random<string & tags.Format<"email">>();
  const firstModeratorPassword = "SecurePassword123!";

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: firstModeratorEmail,
        password: firstModeratorPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(firstModerator);

  const afterFirstTimestamp = new Date();

  // Wait for timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 3: Create second moderator account
  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherPassword456!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(secondModerator);

  const afterSecondTimestamp = new Date();

  // Wait for timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 4: Create third moderator account
  const thirdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ThirdPassword789!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(thirdModerator);

  const afterThirdTimestamp = new Date();

  // Step 5: Test created_after filter for first moderator - should return session created after baseline
  const firstModeratorSessionsAfter: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: firstModerator.id,
        body: {
          created_after: baselineTimestamp.toISOString(),
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(firstModeratorSessionsAfter);

  TestValidator.predicate(
    "first moderator has at least one session after baseline",
    firstModeratorSessionsAfter.data.length >= 1,
  );

  // Verify the session belongs to the correct moderator
  for (const session of firstModeratorSessionsAfter.data) {
    TestValidator.equals(
      "session belongs to first moderator",
      session.discussion_board_moderator_id,
      firstModerator.id,
    );
  }

  // Step 6: Test created_before filter for third moderator - sessions created before after-third timestamp
  const thirdModeratorSessionsBefore: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: thirdModerator.id,
        body: {
          created_before: afterThirdTimestamp.toISOString(),
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(thirdModeratorSessionsBefore);

  TestValidator.predicate(
    "third moderator has at least one session before cutoff",
    thirdModeratorSessionsBefore.data.length >= 1,
  );

  for (const session of thirdModeratorSessionsBefore.data) {
    TestValidator.equals(
      "session belongs to third moderator",
      session.discussion_board_moderator_id,
      thirdModerator.id,
    );
  }

  // Step 7: Test bounded date range for second moderator
  const secondModeratorSessionsBounded: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: secondModerator.id,
        body: {
          created_after: afterFirstTimestamp.toISOString(),
          created_before: afterThirdTimestamp.toISOString(),
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(secondModeratorSessionsBounded);

  TestValidator.predicate(
    "second moderator has sessions within date range",
    secondModeratorSessionsBounded.data.length >= 1,
  );

  // Verify all returned sessions are within the specified date range
  for (const session of secondModeratorSessionsBounded.data) {
    const sessionCreatedAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at is after lower bound",
      sessionCreatedAt >= afterFirstTimestamp,
    );
    TestValidator.predicate(
      "session created_at is before upper bound",
      sessionCreatedAt <= afterThirdTimestamp,
    );
    TestValidator.equals(
      "session belongs to second moderator",
      session.discussion_board_moderator_id,
      secondModerator.id,
    );
  }

  // Step 8: Test with date range before any moderators were created (should return empty)
  const veryEarlyStart = new Date(baselineTimestamp.getTime() - 1000 * 60 * 60); // 1 hour before
  const veryEarlyEnd = new Date(baselineTimestamp.getTime() - 1000); // 1 second before baseline

  const emptyResult: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: firstModerator.id,
        body: {
          created_after: veryEarlyStart.toISOString(),
          created_before: veryEarlyEnd.toISOString(),
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(emptyResult);

  TestValidator.equals(
    "date range before moderator creation returns no sessions",
    emptyResult.data.length,
    0,
  );

  // Step 9: Test created_after with future timestamp (should return empty)
  const futureTimestamp = new Date(afterThirdTimestamp.getTime() + 1000 * 60); // 1 minute in future

  const futureResult: IPageIDiscussionBoardModeratorSession =
    await api.functional.discussionBoard.moderator.moderators.sessions.index(
      connection,
      {
        moderatorId: secondModerator.id,
        body: {
          created_after: futureTimestamp.toISOString(),
        } satisfies IDiscussionBoardModeratorSession.IRequest,
      },
    );
  typia.assert(futureResult);

  TestValidator.equals(
    "created_after with future timestamp returns no sessions",
    futureResult.data.length,
    0,
  );
}
