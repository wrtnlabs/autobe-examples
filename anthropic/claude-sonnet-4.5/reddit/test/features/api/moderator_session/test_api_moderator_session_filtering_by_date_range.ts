import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";

/**
 * Test moderator session filtering by date range.
 *
 * This test validates that moderators can filter their session history using
 * created_from and created_to date range parameters. Since only the join
 * endpoint is available (no separate login endpoint), the test creates multiple
 * moderator accounts at staggered time intervals, where each account creation
 * generates one session. The test then queries sessions with various date range
 * filters to verify correct filtering behavior.
 *
 * Process:
 *
 * 1. Create first moderator account and record timestamp (early session)
 * 2. Wait to ensure distinct timestamps
 * 3. Create second moderator account and record timestamp (mid session)
 * 4. Wait again for timestamp distinction
 * 5. Create third moderator account and record timestamp (late session)
 * 6. Test filtering with created_from to get sessions after a point in time
 * 7. Test filtering with created_to to get sessions before a point in time
 * 8. Test filtering with both parameters for a specific time window
 * 9. Verify pagination works correctly with date filtering
 * 10. Validate that only sessions within specified ranges are returned
 */
export async function test_api_moderator_session_filtering_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const beforeFirstSession = new Date();

  const moderator1: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator1);

  const afterFirstSession = new Date();

  // Step 2: Wait to create distinct timestamp separation
  await new Promise((resolve) => setTimeout(resolve, 500));

  const beforeSecondSession = new Date();

  // Step 3: Create second moderator account
  const moderator2: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password456!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.101",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator2);

  const afterSecondSession = new Date();

  // Step 4: Wait again for timestamp distinction
  await new Promise((resolve) => setTimeout(resolve, 500));

  const beforeThirdSession = new Date();

  // Step 5: Create third moderator account
  const moderator3: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password789!",
        nickname: RandomGenerator.name(),
        ip: "192.168.1.102",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator3);

  const afterThirdSession = new Date();

  // Step 6: Query all sessions for moderator1 to establish baseline
  const allSessions1: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator1.username,
        body: {} satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(allSessions1);

  TestValidator.predicate(
    "moderator1 should have at least one session",
    allSessions1.data.length >= 1,
  );

  // Step 7: Test filtering with created_from for moderator2
  const sessionsAfterFirst: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator2.username,
        body: {
          created_from: beforeSecondSession.toISOString(),
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsAfterFirst);

  // Verify sessions are after the created_from timestamp
  for (const session of sessionsAfterFirst.data) {
    const sessionTime = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at should be >= created_from",
      sessionTime >= beforeSecondSession,
    );
  }

  // Step 8: Test filtering with created_to for moderator2
  const sessionsBeforeThird: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator2.username,
        body: {
          created_to: afterSecondSession.toISOString(),
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsBeforeThird);

  // Verify sessions are before the created_to timestamp
  for (const session of sessionsBeforeThird.data) {
    const sessionTime = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at should be <= created_to",
      sessionTime <= afterSecondSession,
    );
  }

  // Step 9: Test filtering with both created_from and created_to
  const sessionsInRange: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator2.username,
        body: {
          created_from: beforeSecondSession.toISOString(),
          created_to: afterSecondSession.toISOString(),
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsInRange);

  // Verify all sessions are within the specified date range
  for (const session of sessionsInRange.data) {
    const sessionTime = new Date(session.created_at);
    TestValidator.predicate(
      "session should be within date range",
      sessionTime >= beforeSecondSession && sessionTime <= afterSecondSession,
    );
  }

  TestValidator.predicate(
    "should have at least one session in range",
    sessionsInRange.data.length >= 1,
  );

  // Step 10: Test that filtering excludes sessions outside range
  const sessionsExcludingThird: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator3.username,
        body: {
          created_to: beforeThirdSession.toISOString(),
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(sessionsExcludingThird);

  // Verify that moderator3's session is NOT in results when filtering before its creation
  const moderator3SessionInResults = sessionsExcludingThird.data.find(
    (s) => s.reddit_community_moderator_id === moderator3.id,
  );

  TestValidator.predicate(
    "sessions created after created_to should be excluded",
    moderator3SessionInResults === undefined,
  );

  // Step 11: Test pagination with date filtering
  const paginatedResult: IPageIRedditCommunityModeratorSession.ISummary =
    await api.functional.redditCommunity.moderator.moderators.sessions.index(
      connection,
      {
        username: moderator1.username,
        body: {
          page: 1,
          limit: 1,
          created_from: beforeFirstSession.toISOString(),
          created_to: afterThirdSession.toISOString(),
        } satisfies IRedditCommunityModeratorSession.IRequest,
      },
    );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResult.data.length <= 1,
  );

  TestValidator.equals(
    "pagination current page should be 0",
    paginatedResult.pagination.current,
    0,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    paginatedResult.pagination.limit === 1,
  );
}
