import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanAppeal";
import type { IRedditCommunityBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanAppeal";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_ban_appeal_temporal_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Define temporal boundaries for testing
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  // Step 3: Test submitted_after filtering (appeals submitted after 7 days ago)
  const afterSevenDays: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_after: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(afterSevenDays);

  // Validate all returned appeals are after the specified date
  afterSevenDays.data.forEach((appeal) => {
    const appealDate = new Date(appeal.created_at);
    TestValidator.predicate(
      "appeal submitted_at is after submitted_after filter",
      appealDate >= sevenDaysAgo,
    );
  });

  // Step 4: Test submitted_before filtering (appeals submitted before 3 days ago)
  const beforeThreeDays: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_before: threeDaysAgo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(beforeThreeDays);

  // Validate all returned appeals are before the specified date
  beforeThreeDays.data.forEach((appeal) => {
    const appealDate = new Date(appeal.created_at);
    TestValidator.predicate(
      "appeal submitted_at is before submitted_before filter",
      appealDate < threeDaysAgo,
    );
  });

  // Step 5: Test combined date range filtering (between 10 and 3 days ago)
  const dateRange: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_after: tenDaysAgo.toISOString(),
          submitted_before: threeDaysAgo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(dateRange);

  // Validate all returned appeals fall within the date range
  dateRange.data.forEach((appeal) => {
    const appealDate = new Date(appeal.created_at);
    TestValidator.predicate(
      "appeal is within date range (after start)",
      appealDate >= tenDaysAgo,
    );
    TestValidator.predicate(
      "appeal is within date range (before end)",
      appealDate < threeDaysAgo,
    );
  });

  // Step 6: Test very recent appeals (last 24 hours)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentAppeals: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_after: oneDayAgo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(recentAppeals);

  // Validate recent appeals filtering
  recentAppeals.data.forEach((appeal) => {
    const appealDate = new Date(appeal.created_at);
    TestValidator.predicate(
      "recent appeal is after one day ago",
      appealDate >= oneDayAgo,
    );
  });

  // Step 7: Test historical appeals (older than 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const historicalAppeals: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_before: thirtyDaysAgo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(historicalAppeals);

  // Validate historical appeals filtering
  historicalAppeals.data.forEach((appeal) => {
    const appealDate = new Date(appeal.created_at);
    TestValidator.predicate(
      "historical appeal is before thirty days ago",
      appealDate < thirtyDaysAgo,
    );
  });

  // Step 8: Test edge case - exact boundary timestamp
  const exactBoundary = sevenDaysAgo.toISOString();
  const boundaryTest: IPageIRedditCommunityBanAppeal.ISummary =
    await api.functional.redditCommunity.moderator.banAppeals.index(
      connection,
      {
        body: {
          submitted_after: exactBoundary,
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityBanAppeal.IRequest,
      },
    );
  typia.assert(boundaryTest);

  // Validate boundary behavior (submitted_after is inclusive: >=)
  boundaryTest.data.forEach((appeal) => {
    const appealDate = new Date(appeal.created_at);
    const boundaryDate = new Date(exactBoundary);
    TestValidator.predicate(
      "appeal at or after exact boundary",
      appealDate >= boundaryDate,
    );
  });

  // Step 9: Verify pagination metadata is present and valid
  TestValidator.predicate(
    "pagination metadata exists",
    afterSevenDays.pagination !== null &&
      afterSevenDays.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    afterSevenDays.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    afterSevenDays.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    afterSevenDays.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    afterSevenDays.pagination.pages >= 0,
  );
}
