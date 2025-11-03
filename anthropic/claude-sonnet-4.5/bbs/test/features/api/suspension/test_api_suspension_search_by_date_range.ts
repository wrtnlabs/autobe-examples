import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test filtering suspensions by date ranges.
 *
 * This test validates the temporal filtering capabilities of the suspension
 * search API. It creates multiple suspensions at different time points and then
 * queries them using date range filters to ensure only suspensions within
 * specified date ranges are returned.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create three member accounts to be suspended
 * 3. Create suspensions with different start dates (recent, one week ago, one
 *    month ago)
 * 4. Search for suspensions within specific date ranges
 * 5. Verify that only suspensions created within the specified date range are
 *    returned
 * 6. Test multiple date range filters to ensure accurate temporal filtering
 */
export async function test_api_suspension_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create three member accounts
  const members = await ArrayUtil.asyncRepeat(3, async () => {
    const memberData = {
      username: RandomGenerator.alphabets(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate;

    const member = await api.functional.discussionBoard.members.create(
      connection,
      {
        body: memberData,
      },
    );
    typia.assert(member);
    return member;
  });

  // Step 3: Create suspensions with different dates
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Create suspension one month ago
  const oldSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[0].id,
          suspension_reason: "Spam violation",
          suspension_details: "Repeated spam posting detected one month ago",
          suspended_at: oneMonthAgo.toISOString(),
          expires_at: new Date(
            oneMonthAgo.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(oldSuspension);

  // Create suspension one week ago
  const midSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[1].id,
          suspension_reason: "Harassment",
          suspension_details: "Harassment behavior detected one week ago",
          suspended_at: oneWeekAgo.toISOString(),
          expires_at: new Date(
            oneWeekAgo.getTime() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(midSuspension);

  // Create recent suspension
  const recentSuspension =
    await api.functional.discussionBoard.moderator.moderation.suspensions.create(
      connection,
      {
        body: {
          discussion_board_member_id: members[2].id,
          suspension_reason: "Hate speech",
          suspension_details: "Hate speech violation detected recently",
          suspended_at: now.toISOString(),
          expires_at: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IDiscussionBoardUserSuspension.ICreate,
      },
    );
  typia.assert(recentSuspension);

  // Step 4: Test date range filtering - last 2 weeks (should return recent and mid suspensions)
  const lastTwoWeeksResult =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          suspended_after: twoWeeksAgo.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(lastTwoWeeksResult);

  TestValidator.predicate(
    "last two weeks should return at least 2 suspensions",
    lastTwoWeeksResult.data.length >= 2,
  );

  TestValidator.predicate(
    "last two weeks should include recent suspension",
    lastTwoWeeksResult.data.some((s) => s.id === recentSuspension.id),
  );

  TestValidator.predicate(
    "last two weeks should include mid suspension",
    lastTwoWeeksResult.data.some((s) => s.id === midSuspension.id),
  );

  TestValidator.predicate(
    "last two weeks should not include old suspension from one month ago",
    !lastTwoWeeksResult.data.some((s) => s.id === oldSuspension.id),
  );

  // Step 5: Test date range filtering - older than 2 weeks (should return old suspension)
  const olderThanTwoWeeksResult =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          suspended_before: twoWeeksAgo.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(olderThanTwoWeeksResult);

  TestValidator.predicate(
    "older than two weeks should include old suspension",
    olderThanTwoWeeksResult.data.some((s) => s.id === oldSuspension.id),
  );

  TestValidator.predicate(
    "older than two weeks should not include recent suspension",
    !olderThanTwoWeeksResult.data.some((s) => s.id === recentSuspension.id),
  );

  // Step 6: Test specific date range (between one month and two weeks ago)
  const specificRangeResult =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          suspended_after: oneMonthAgo.toISOString(),
          suspended_before: twoWeeksAgo.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(specificRangeResult);

  TestValidator.predicate(
    "specific range should include suspensions between one month and two weeks ago",
    specificRangeResult.data.some((s) => s.id === oldSuspension.id) ||
      specificRangeResult.data.some((s) => s.id === midSuspension.id),
  );

  TestValidator.predicate(
    "specific range should not include recent suspension",
    !specificRangeResult.data.some((s) => s.id === recentSuspension.id),
  );

  // Step 7: Test very recent range (last 24 hours - should return only recent suspension)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const veryRecentResult =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          suspended_after: yesterday.toISOString(),
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(veryRecentResult);

  TestValidator.predicate(
    "very recent range should include recent suspension",
    veryRecentResult.data.some((s) => s.id === recentSuspension.id),
  );

  TestValidator.predicate(
    "very recent range should not include old or mid suspensions",
    !veryRecentResult.data.some(
      (s) => s.id === oldSuspension.id || s.id === midSuspension.id,
    ),
  );
}
