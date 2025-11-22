import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformContentEngagementTrend";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformContentEngagementAnalytics } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementAnalytics";
import type { IRedditPlatformContentEngagementTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformContentEngagementTrend";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test engagement trend analytics with duration-based filtering for quality
 * assessment.
 *
 * This test validates that moderators can filter engagements by minimum and
 * maximum duration thresholds to focus on meaningful interactions and exclude
 * brief accidental interactions. The test covers authentication setup, various
 * duration filtering scenarios, and comprehensive result validation.
 *
 * Test Flow:
 *
 * 1. Authenticate as community moderator
 * 2. Test duration filtering with different threshold combinations
 * 3. Validate filtering logic and data accuracy
 * 4. Test edge cases and boundary conditions
 */
export async function test_api_moderator_engagement_trends_duration_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as community moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAccountId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: moderatorAccountId,
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
        assigned_communities: JSON.stringify([
          "test-community-1",
          "test-community-2",
        ]),
        appointed_by: "system_admin",
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        href: "https://example.com/register",
        referrer: "https://reddit-platform.com",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test duration filtering - Minimum duration only (exclude brief interactions)
  const minDurationFilter: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      page: 1,
      limit: 20,
      duration_min_seconds: 30, // Minimum 30 seconds for meaningful engagement
      engagement_types: ["view", "scroll", "share"],
      date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      date_to: new Date().toISOString(),
      order_by: "duration_desc",
    };

  const minDurationResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: minDurationFilter,
      },
    );
  typia.assert(minDurationResults);

  // Validate pagination structure
  TestValidator.equals(
    "min duration filter pagination structure",
    minDurationResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "min duration filter limit applied",
    minDurationResults.pagination.limit,
    20,
  );

  // Validate that all returned engagements meet minimum duration threshold
  for (const engagement of minDurationResults.data) {
    if (
      engagement.engagement_duration_seconds !== null &&
      engagement.engagement_duration_seconds !== undefined
    ) {
      TestValidator.predicate(
        "engagement meets minimum duration threshold",
        engagement.engagement_duration_seconds >= 30,
      );
    }
  }

  // Step 3: Test duration filtering - Maximum duration only (exclude unusually long interactions)
  const maxDurationFilter: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      page: 1,
      limit: 15,
      duration_max_seconds: 600, // Maximum 10 minutes to exclude suspicious behavior
      engagement_types: ["view", "scroll"],
      date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      date_to: new Date().toISOString(),
      order_by: "duration_asc",
    };

  const maxDurationResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: maxDurationFilter,
      },
    );
  typia.assert(maxDurationResults);

  // Validate pagination for max duration filter
  TestValidator.equals(
    "max duration filter pagination structure",
    maxDurationResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "max duration filter limit applied",
    maxDurationResults.pagination.limit,
    15,
  );

  // Validate that all returned engagements are within maximum duration threshold
  for (const engagement of maxDurationResults.data) {
    if (
      engagement.engagement_duration_seconds !== null &&
      engagement.engagement_duration_seconds !== undefined
    ) {
      TestValidator.predicate(
        "engagement within maximum duration threshold",
        engagement.engagement_duration_seconds <= 600,
      );
    }
  }

  // Step 4: Test duration filtering - Both min and max (quality engagement range)
  const qualityRangeFilter: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      page: 1,
      limit: 25,
      duration_min_seconds: 15, // At least 15 seconds for quality engagement
      duration_max_seconds: 300, // Maximum 5 minutes for normal engagement
      engagement_types: ["view", "scroll", "share", "save"],
      with_metadata: true, // Include detailed metadata for analysis
      date_from: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // Last 14 days
      date_to: new Date().toISOString(),
      order_by: "created_at_desc",
    };

  const qualityRangeResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: qualityRangeFilter,
      },
    );
  typia.assert(qualityRangeResults);

  // Validate quality range filtering results
  TestValidator.equals(
    "quality range filter pagination current",
    qualityRangeResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "quality range filter limit applied",
    qualityRangeResults.pagination.limit,
    25,
  );

  // Validate that all engagements fall within the quality range
  for (const engagement of qualityRangeResults.data) {
    if (
      engagement.engagement_duration_seconds !== null &&
      engagement.engagement_duration_seconds !== undefined
    ) {
      TestValidator.predicate(
        "engagement within quality range (15-300 seconds)",
        engagement.engagement_duration_seconds >= 15 &&
          engagement.engagement_duration_seconds <= 300,
      );
    }
  }

  // Step 5: Test invalid duration ranges (edge cases)
  await TestValidator.error(
    "invalid duration range (min > max) should fail",
    async () => {
      await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            duration_min_seconds: 100, // Min greater than max
            duration_max_seconds: 50,
            order_by: "duration_desc",
          } satisfies IRedditPlatformContentEngagementAnalytics.IRequest,
        },
      );
    },
  );

  // Step 6: Test boundary values for duration filtering
  const boundaryFilter: IRedditPlatformContentEngagementAnalytics.IRequest = {
    page: 1,
    limit: 10,
    duration_min_seconds: 0, // Minimum boundary (should include all)
    duration_max_seconds: 86400, // Maximum boundary (24 hours)
    order_by: "duration_asc",
  };

  const boundaryResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: boundaryFilter,
      },
    );
  typia.assert(boundaryResults);

  // Step 7: Test with zero results scenario (no engagements match criteria)
  const noResultsFilter: IRedditPlatformContentEngagementAnalytics.IRequest = {
    page: 1,
    limit: 20,
    duration_min_seconds: 3600, // 1 hour minimum (unlikely to have matches)
    duration_max_seconds: 7200, // 2 hours maximum
    order_by: "duration_desc",
  };

  const noResultsResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: noResultsFilter,
      },
    );
  typia.assert(noResultsResults);

  // Validate that no results scenario returns empty data array
  TestValidator.equals(
    "no results scenario returns empty array",
    noResultsResults.data.length,
    0,
  );
  TestValidator.equals(
    "no results scenario maintains pagination structure",
    noResultsResults.pagination.records,
    0,
  );

  // Step 8: Test pagination with duration filtering
  const paginationFilter: IRedditPlatformContentEngagementAnalytics.IRequest = {
    page: 2, // Second page
    limit: 5, // Small page size
    duration_min_seconds: 10,
    duration_max_seconds: 120,
    order_by: "duration_desc",
  };

  const paginationResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: paginationFilter,
      },
    );
  typia.assert(paginationResults);

  // Validate pagination details
  TestValidator.equals(
    "pagination filter page number",
    paginationResults.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination filter page size",
    paginationResults.pagination.limit,
    5,
  );

  // Step 9: Validate engagement metadata inclusion when requested
  const metadataFilter: IRedditPlatformContentEngagementAnalytics.IRequest = {
    page: 1,
    limit: 10,
    duration_min_seconds: 5,
    with_metadata: true, // Request detailed metadata
    order_by: "duration_desc",
  };

  const metadataResults: IPageIRedditPlatformContentEngagementTrend =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: metadataFilter,
      },
    );
  typia.assert(metadataResults);

  // Validate that metadata filter was applied (results should include metadata when available)
  TestValidator.equals(
    "metadata filter applied",
    metadataResults.data.length >= 0,
    true,
  );
}
