import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_analytics_user_behavior_edge_case_data(
  connection: api.IConnection,
) {
  // 1. Create moderator account for authentication
  const moderatorData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: false,
      can_warn_users: true,
      can_pin_posts: false,
      can_edit_rules: true,
      can_manage_moderators: false,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: "system_admin",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    href: "https://test.example.com",
    referrer: "https://test.example.com",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 2. Test empty dataset scenario
  const emptyAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "non_existent_activity",
          date_from: new Date("2025-01-01").toISOString(),
          date_to: new Date("2025-01-02").toISOString(),
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(emptyAnalytics);
  TestValidator.equals(
    "empty dataset should return no results",
    emptyAnalytics.data.length,
    0,
  );

  // 3. Test maximum pagination limits
  const maxPaginationAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 100, // Maximum allowed limit
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(maxPaginationAnalytics);
  TestValidator.equals(
    "max pagination should return results within limit",
    maxPaginationAnalytics.data.length <= 100,
    true,
  );

  // 4. Test boundary date ranges - far future
  const futureDateAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: new Date("2030-01-01").toISOString(),
          date_to: new Date("2030-12-31").toISOString(),
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(futureDateAnalytics);

  // 5. Test boundary date ranges - far past
  const pastDateAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: new Date("1970-01-01").toISOString(),
          date_to: new Date("1970-12-31").toISOString(),
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(pastDateAnalytics);

  // 6. Test invalid date range (end before start)
  await TestValidator.error("invalid date range should fail", async () => {
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: new Date("2025-12-31").toISOString(),
          date_to: new Date("2025-01-01").toISOString(), // End before start
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  });

  // 7. Test maximum page number
  const maxPageAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 10,
          page: 999999, // Very high page number
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(maxPageAnalytics);
  TestValidator.equals(
    "high page number should return empty results",
    maxPageAnalytics.data.length,
    0,
  );

  // 8. Test extreme limit values
  const extremeLimitAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 1000, // Beyond maximum, should be capped
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(extremeLimitAnalytics);

  // 9. Test zero page number
  await TestValidator.error("zero page number should fail", async () => {
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 10,
          page: 0, // Page must be >= 1
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  });

  // 10. Test negative limit
  await TestValidator.error("negative limit should fail", async () => {
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: -1, // Negative limit
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  });

  // 11. Test invalid activity types
  const invalidActivityAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "invalid_activity_type,another_invalid_type",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(invalidActivityAnalytics);

  // 12. Test valid but edge case activity types
  const validActivityAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,comment_created,post_voted",
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(validActivityAnalytics);

  // 13. Test sorting with invalid field
  const invalidSortAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 10,
          order_by: "invalid_field" as any, // Invalid field
          order_direction: "desc",
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(invalidSortAnalytics);

  // 14. Test sorting with valid fields
  const validSortAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 10,
          order_by: "created_at",
          order_direction: "asc",
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(validSortAnalytics);

  // 15. Test very long date range (full year)
  const fullYearAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: new Date("2025-01-01T00:00:00.000Z").toISOString(),
          date_to: new Date("2025-12-31T23:59:59.999Z").toISOString(),
          limit: 50,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(fullYearAnalytics);

  // 16. Test single day range
  const singleDayAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          date_from: new Date("2025-11-21T00:00:00.000Z").toISOString(),
          date_to: new Date("2025-11-21T23:59:59.999Z").toISOString(),
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(singleDayAnalytics);

  // 17. Test all filters combined
  const combinedFiltersAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,comment_created",
          community_id: typia.random<string & tags.Format<"uuid">>(),
          date_from: new Date("2025-01-01").toISOString(),
          date_to: new Date("2025-12-31").toISOString(),
          limit: 20,
          order_by: "activity_type",
          order_direction: "desc",
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(combinedFiltersAnalytics);

  // 18. Test target_id filtering with invalid UUID
  const invalidTargetAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 10,
          page: 1,
          target_id: "invalid-uuid-format",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(invalidTargetAnalytics);

  // 19. Test system stability with rapid consecutive calls
  const stabilityTest = Array.from({ length: 5 }, () =>
    api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          limit: 20,
          page: Math.floor(Math.random() * 100) + 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    ),
  );

  const stabilityResults = await Promise.all(stabilityTest);
  stabilityResults.forEach((result, index) => {
    typia.assert(result);
    TestValidator.equals(
      `stability test ${index + 1} should complete`,
      result.data !== undefined,
      true,
    );
  });
}
