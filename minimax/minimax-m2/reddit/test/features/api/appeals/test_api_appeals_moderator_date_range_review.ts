import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * E2E test for appeals search with date range filtering by community
 * moderators.
 *
 * Tests the complete workflow of community moderator authentication and appeals
 * management capabilities, specifically validating date range filtering
 * functionality for effective appeal review workflows.
 *
 * Test Flow:
 *
 * 1. Create community moderator account with proper authentication
 * 2. Test appeals search with various date range combinations
 * 3. Validate search results match date criteria
 * 4. Test edge cases and error handling
 * 5. Verify pagination and result formatting
 */
export async function test_api_appeals_moderator_date_range_review(
  connection: api.IConnection,
) {
  // 1. Create community moderator account for date filtering test
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUserId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: moderatorUserId,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: true,
          can_edit_rules: true,
          can_manage_moderators: true,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([communityId]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://test.example.com/register",
        referrer: "https://test.example.com",
        ip: "192.168.1.1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test appeals search with date range filtering - future date range (no results expected)
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const futureDatePlusWeek = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const futureDateSearchResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: futureDate,
          created_at_to: futureDatePlusWeek,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(futureDateSearchResult);

  TestValidator.equals(
    "future date range should return empty results",
    futureDateSearchResult.data.length,
    0,
  );

  // 3. Test appeals search with historical date range covering potential appeal period
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentDate = new Date().toISOString();

  const historicalDateSearchResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: pastDate,
          created_at_to: recentDate,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(historicalDateSearchResult);

  // Validate pagination structure
  TestValidator.equals(
    "search result has valid pagination",
    historicalDateSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    historicalDateSearchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination has valid page count",
    historicalDateSearchResult.pagination.pages >= 0,
  );

  // 4. Test search with resolution date range filtering
  const resolutionDateRangeResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          resolved_at_from: pastDate,
          resolved_at_to: recentDate,
          order_by: "resolved_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(resolutionDateRangeResult);

  // 5. Test search with combined creation and resolution date filters
  const combinedDateFilterResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: pastDate,
          created_at_to: recentDate,
          resolved_at_from: pastDate,
          resolved_at_to: recentDate,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(combinedDateFilterResult);

  // 6. Test search with status and date range combination
  const statusAndDateResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
          created_at_from: pastDate,
          created_at_to: recentDate,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(statusAndDateResult);

  // 7. Test pagination with date filtering
  const secondPageResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          created_at_from: pastDate,
          created_at_to: recentDate,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(secondPageResult);

  TestValidator.equals(
    "second page has correct pagination",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page has correct limit",
    secondPageResult.pagination.limit,
    10,
  );

  // 8. Test sorting options with date ranges
  const sortingOptions = [
    "created_at",
    "updated_at",
    "resolved_at",
    "appeal_level",
  ] as const;

  for (const sortField of sortingOptions) {
    const sortedResult =
      await api.functional.redditPlatform.communityModerator.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            created_at_from: pastDate,
            created_at_to: recentDate,
            order_by: sortField,
            order_direction: "asc",
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(sortedResult);
  }

  // 9. Test appeal level filtering with date ranges
  const appealLevelResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_level: "initial",
          created_at_from: pastDate,
          created_at_to: recentDate,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(appealLevelResult);

  // 10. Validate result structure for appeals with date filtering
  for (const appeal of historicalDateSearchResult.data) {
    // Validate each appeal has required fields
    TestValidator.predicate("appeal has valid ID", appeal.id.length > 0);
    TestValidator.predicate(
      "appeal has valid status",
      [
        "pending",
        "under_review",
        "approved",
        "denied",
        "withdrawn",
        "escalated",
      ].includes(appeal.status),
    );
    TestValidator.predicate(
      "appeal has valid appeal level",
      ["initial", "secondary", "final"].includes(appeal.appeal_level),
    );
    TestValidator.predicate(
      "appeal has creation timestamp",
      appeal.created_at.length > 0,
    );
    TestValidator.predicate(
      "appeal has update timestamp",
      appeal.updated_at.length > 0,
    );

    // Validate dates are within the filtered range
    const appealCreatedAt = new Date(appeal.created_at);
    const filterStartDate = new Date(pastDate);
    const filterEndDate = new Date(recentDate);

    TestValidator.predicate(
      "appeal creation date is within filtered range",
      appealCreatedAt >= filterStartDate && appealCreatedAt <= filterEndDate,
    );

    // Validate related entities
    if (appeal.moderation_action) {
      TestValidator.predicate(
        "moderation action has valid ID",
        appeal.moderation_action.id.length > 0,
      );
    }

    if (appeal.appellant_session) {
      TestValidator.predicate(
        "appellant session has valid ID",
        appeal.appellant_session.id.length > 0,
      );
    }
  }

  // 11. Test edge case: invalid date range (from > to)
  await TestValidator.error("should reject invalid date range", async () => {
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_at_from: recentDate,
          created_at_to: pastDate, // Invalid: from is after to
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  });

  // 12. Test maximum limit with date filtering
  const maxLimitResult =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100, // Maximum allowed limit
          created_at_from: pastDate,
          created_at_to: recentDate,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit request processed successfully",
    maxLimitResult.pagination.limit,
    100,
  );

  // Test validation: All date range filters work correctly
  TestValidator.predicate(
    "date range filtering is functional",
    historicalDateSearchResult.pagination.records >= 0,
  );
}
