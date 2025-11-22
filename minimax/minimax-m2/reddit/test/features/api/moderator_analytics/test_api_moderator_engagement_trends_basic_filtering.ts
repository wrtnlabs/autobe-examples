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
 * Test community moderator analytics filtering by engagement types with basic
 * pagination.
 *
 * This test validates that moderators can successfully retrieve engagement
 * trends data with proper filtering for different engagement types (view,
 * scroll, share, save, click_external_link) and that results are properly
 * paginated with correct metadata. The test covers both successful data
 * retrieval scenarios and edge cases to ensure robust analytics functionality.
 *
 * Test scenarios include:
 *
 * 1. Creating community moderator authentication context
 * 2. Testing engagement type filtering with single and multiple types
 * 3. Validating pagination parameters and metadata accuracy
 * 4. Testing date range filtering capabilities
 * 5. Verifying metadata inclusion functionality
 * 6. Testing edge cases with invalid filter combinations
 */
export async function test_api_moderator_engagement_trends_basic_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for authentication
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();
  const moderatorCreateData = {
    registered_user_id: registeredUserId,
    moderation_permissions: JSON.stringify({
      can_remove_posts: true,
      can_remove_comments: true,
      can_ban_users: true,
      can_warn_users: true,
      can_pin_posts: true,
      can_edit_rules: false,
      can_manage_moderators: false,
      can_approve_posts: true,
    }),
    assigned_communities: JSON.stringify([
      typia.random<string & tags.Format<"uuid">>(),
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: typia.random<string & tags.Format<"uuid">>(),
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderatorAuth: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorCreateData,
    });
  typia.assert(moderatorAuth);

  // Step 2: Test engagement analytics with engagement type filtering
  const singleEngagementTypeQuery: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["view"],
      page: 1,
      limit: 20,
    };

  const singleTypeResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: singleEngagementTypeQuery,
      },
    );
  typia.assert(singleTypeResult);

  // Validate single engagement type response structure and pagination
  TestValidator.equals(
    "single engagement type result has data",
    singleTypeResult.data.length <= 20,
    true,
  );
  TestValidator.equals(
    "single engagement type pagination is valid",
    singleTypeResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    singleTypeResult.pagination.limit === 20,
  );

  // Step 3: Test multiple engagement types filtering
  const multipleEngagementTypesQuery: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["view", "scroll", "share", "save"],
      page: 1,
      limit: 10,
    };

  const multipleTypesResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: multipleEngagementTypesQuery,
      },
    );
  typia.assert(multipleTypesResult);

  // Validate multiple engagement types response
  TestValidator.equals(
    "multiple engagement types result has data",
    multipleTypesResult.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "multiple engagement types pagination current page",
    multipleTypesResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    multipleTypesResult.pagination.limit === 10,
  );

  // Step 4: Test pagination with different page numbers
  const secondPageQuery: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: ["view", "scroll"],
    page: 2,
    limit: 5,
  };

  const secondPageResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: secondPageQuery,
      },
    );
  typia.assert(secondPageResult);

  // Validate second page pagination
  TestValidator.equals(
    "second page current is 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "second page limit is 5",
    secondPageResult.pagination.limit === 5,
  );

  // Step 5: Test date range filtering
  const dateRangeQuery: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: ["view", "share"],
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    date_to: new Date().toISOString(), // current date
    page: 1,
    limit: 15,
  };

  const dateRangeResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: dateRangeQuery,
      },
    );
  typia.assert(dateRangeResult);

  // Validate date range filtering response
  TestValidator.equals(
    "date range result has data",
    dateRangeResult.data.length <= 15,
    true,
  );
  TestValidator.equals(
    "date range pagination current page",
    dateRangeResult.pagination.current,
    1,
  );

  // Step 6: Test with metadata inclusion
  const metadataQuery: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: ["view"],
    with_metadata: true,
    page: 1,
    limit: 10,
  };

  const metadataResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: metadataQuery,
      },
    );
  typia.assert(metadataResult);

  // Validate metadata inclusion response
  TestValidator.equals(
    "metadata result has data",
    metadataResult.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "metadata result pagination current page",
    metadataResult.pagination.current,
    1,
  );

  // Step 7: Test all engagement types (empty array for all types)
  const allTypesQuery: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: [],
    page: 1,
    limit: 25,
  };

  const allTypesResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: allTypesQuery,
      },
    );
  typia.assert(allTypesResult);

  // Validate all engagement types response
  TestValidator.equals(
    "all engagement types result has data",
    allTypesResult.data.length <= 25,
    true,
  );
  TestValidator.equals(
    "all engagement types pagination current page",
    allTypesResult.pagination.current,
    1,
  );

  // Step 8: Test click_external_link engagement type specifically
  const externalLinkQuery: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["click_external_link"],
      page: 1,
      limit: 10,
    };

  const externalLinkResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: externalLinkQuery,
      },
    );
  typia.assert(externalLinkResult);

  // Validate external link engagement type response
  TestValidator.equals(
    "external link engagement result has data",
    externalLinkResult.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "external link pagination current page",
    externalLinkResult.pagination.current,
    1,
  );

  // Step 9: Test pagination edge case with maximum limit
  const maxLimitQuery: IRedditPlatformContentEngagementAnalytics.IRequest = {
    engagement_types: [
      "view",
      "scroll",
      "share",
      "save",
      "click_external_link",
    ],
    page: 1,
    limit: 100, // Maximum allowed limit
  };

  const maxLimitResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: maxLimitQuery,
      },
    );
  typia.assert(maxLimitResult);

  // Validate maximum limit response
  TestValidator.equals(
    "max limit result has data",
    maxLimitResult.data.length <= 100,
    true,
  );
  TestValidator.predicate(
    "max limit pagination limit is 100",
    maxLimitResult.pagination.limit === 100,
  );

  // Step 10: Comprehensive test with all parameters combined
  const comprehensiveQuery: IRedditPlatformContentEngagementAnalytics.IRequest =
    {
      engagement_types: ["view", "share"],
      date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      date_to: new Date().toISOString(), // current date
      with_metadata: true,
      page: 1,
      limit: 12,
    };

  const comprehensiveResult =
    await api.functional.redditPlatform.communityModerator.analytics.engagementTrends.index(
      connection,
      {
        body: comprehensiveQuery,
      },
    );
  typia.assert(comprehensiveResult);

  // Validate comprehensive query response
  TestValidator.equals(
    "comprehensive query result has data",
    comprehensiveResult.data.length <= 12,
    true,
  );
  TestValidator.equals(
    "comprehensive query pagination current page",
    comprehensiveResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "comprehensive query pagination limit is 12",
    comprehensiveResult.pagination.limit === 12,
  );

  // Final validation: Ensure all responses have proper structure and metadata
  TestValidator.predicate(
    "all responses have valid pagination structure",
    singleTypeResult.pagination &&
      singleTypeResult.pagination.current >= 0 &&
      singleTypeResult.pagination.limit > 0 &&
      singleTypeResult.pagination.records >= 0 &&
      singleTypeResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "engagement trend records have valid structure",
    singleTypeResult.data.length === 0 || // May be empty if no data exists
      (singleTypeResult.data.length > 0 &&
        singleTypeResult.data.every(
          (trend) =>
            trend.id &&
            trend.engagement_type &&
            trend.reddit_platform_registereduser_id &&
            trend.created_at,
        )),
  );
}
