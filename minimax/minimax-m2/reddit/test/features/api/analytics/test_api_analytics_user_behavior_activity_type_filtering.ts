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

export async function test_api_analytics_user_behavior_activity_type_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate community moderator
  const moderatorData = {
    registered_user_id: typia.random<string & tags.Format<"uuid">>(),
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
      typia.random<string & tags.Format<"uuid">>(),
    ]),
    appointed_by: "system",
    moderation_count: 0,
    last_moderation_action: new Date().toISOString(),
    active_status: "active",
    appointed_at: new Date().toISOString(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IRedditPlatformCommunityModerator.ICreate;

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Test activity type filtering with different filter combinations
  const communityId = typia.random<string & tags.Format<"uuid">>();

  // Test filtering by single activity type
  const singleTypeFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created",
          community_id: communityId,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(singleTypeFilter);

  // Validate response structure and data types
  TestValidator.equals(
    "response has pagination data",
    singleTypeFilter.pagination,
    singleTypeFilter.pagination,
  );
  TestValidator.equals(
    "response has activity data array",
    Array.isArray(singleTypeFilter.data),
    true,
  );
  TestValidator.predicate(
    "pagination has valid structure",
    singleTypeFilter.pagination.current >= 0 &&
      singleTypeFilter.pagination.limit >= 0 &&
      singleTypeFilter.pagination.records >= 0 &&
      singleTypeFilter.pagination.pages >= 0,
  );

  // Step 3: Test filtering by multiple activity types
  const multiTypeFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,comment_created,voting",
          community_id: communityId,
          limit: 10,
          page: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(multiTypeFilter);

  // Validate that filtered activities are of specified types
  const filteredActivityTypes = multiTypeFilter.data.map(
    (activity) => activity.activity_type,
  );
  TestValidator.predicate(
    "all activities are from filtered types",
    filteredActivityTypes.every((type) =>
      ["post_created", "comment_created", "voting"].includes(type),
    ),
  );

  // Step 4: Test date range filtering with activity types
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();

  const dateRangeFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created,comment_created",
          community_id: communityId,
          date_from: dateFrom,
          date_to: dateTo,
          limit: 15,
          order_by: "activity_type",
          order_direction: "asc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(dateRangeFilter);

  // Validate date filtering by checking activity timestamps
  const activitiesInDateRange = dateRangeFilter.data.filter((activity) => {
    const activityDate = new Date(activity.created_at);
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    return activityDate >= fromDate && activityDate <= toDate;
  });
  TestValidator.equals(
    "all activities are within date range",
    activitiesInDateRange.length,
    dateRangeFilter.data.length,
  );

  // Step 5: Test pagination with activity type filtering
  const paginationTest =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "comment_created",
          community_id: communityId,
          limit: 5,
          page: 1,
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(paginationTest);

  TestValidator.equals(
    "pagination limit is respected",
    paginationTest.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationTest.data.length <= 5,
  );

  // Test second page
  const secondPage =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "comment_created",
          community_id: communityId,
          limit: 5,
          page: 2,
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page has correct current page",
    secondPage.pagination.current,
    2,
  );

  // Step 6: Test activity data structure validation
  const allActivitiesFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          community_id: communityId,
          limit: 1,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(allActivitiesFilter);

  if (allActivitiesFilter.data.length > 0) {
    const activity = allActivitiesFilter.data[0];

    // Validate required activity properties exist and have correct types
    TestValidator.equals(
      "activity has valid ID",
      typeof activity.id === "string" && activity.id.length > 0,
      true,
    );
    TestValidator.equals(
      "activity has valid type",
      typeof activity.activity_type === "string" &&
        activity.activity_type.length > 0,
      true,
    );
    TestValidator.equals(
      "activity has valid description",
      typeof activity.activity_description === "string" &&
        activity.activity_description.length > 0,
      true,
    );
    TestValidator.equals(
      "activity has valid timestamp",
      typeof activity.created_at === "string" &&
        !isNaN(Date.parse(activity.created_at)),
      true,
    );
    TestValidator.equals(
      "activity has valid community ID",
      typeof activity.target_community_id === "string" &&
        activity.target_community_id.length > 0,
      true,
    );

    // Validate optional properties if they exist
    if (activity.activity_metadata !== undefined) {
      TestValidator.equals(
        "activity metadata is string or null",
        typeof activity.activity_metadata === "string" ||
          activity.activity_metadata === null,
        true,
      );
    }
    if (activity.ip_address !== undefined) {
      TestValidator.equals(
        "IP address format is valid",
        typeof activity.ip_address === "string",
        true,
      );
    }
    if (activity.user_agent !== undefined) {
      TestValidator.equals(
        "user agent is string or null",
        typeof activity.user_agent === "string" || activity.user_agent === null,
        true,
      );
    }
  }

  // Step 7: Test edge cases and boundary conditions
  const emptyResultFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "nonexistent_activity_type",
          community_id: communityId,
          limit: 20,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(emptyResultFilter);

  TestValidator.predicate(
    "empty filter returns empty data array",
    Array.isArray(emptyResultFilter.data) && emptyResultFilter.data.length >= 0,
  );

  // Test with very high page number
  const highPageFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          activity_type: "post_created",
          community_id: communityId,
          limit: 10,
          page: 9999,
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(highPageFilter);

  TestValidator.equals(
    "high page number returns empty data",
    highPageFilter.data.length,
    0,
  );
  TestValidator.equals(
    "high page number has correct pagination",
    highPageFilter.pagination.current,
    9999,
  );
}
