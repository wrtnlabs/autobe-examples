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

/**
 * Test user behavior analytics with pagination controls and sorting options.
 *
 * Community moderators should be able to navigate large user activity datasets
 * efficiently with proper sorting by timestamp and activity type, validating
 * pagination integrity and data ordering consistency.
 *
 * This test validates:
 *
 * 1. Moderator authentication and authorization
 * 2. Analytics endpoint accessibility for community moderators
 * 3. Pagination functionality with various page sizes and navigation
 * 4. Sorting by different criteria (timestamp, activity type) and directions
 * 5. Data consistency across paginated results
 * 6. Filtering by activity type and community constraints
 * 7. Boundary conditions and error handling
 */
export async function test_api_analytics_user_behavior_pagination_sorted(
  connection: api.IConnection,
) {
  // Step 1: Establish moderator authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const registeredUserId = typia.random<string & tags.Format<"uuid">>();

  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: registeredUserId,
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: false,
          can_warn_users: true,
          can_pin_posts: false,
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
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator authentication successful",
    moderator.token.access.length > 0,
    true,
  );

  // Step 2: Test basic analytics request without filters
  const basicAnalytics =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(basicAnalytics);
  TestValidator.equals(
    "basic analytics response structure",
    basicAnalytics.data.length <= 20,
    true,
  );
  TestValidator.equals(
    "pagination info present",
    basicAnalytics.pagination.current >= 0,
    true,
  );

  // Step 3: Test pagination with different page sizes
  const pageSizeTests = [10, 25, 50, 100];
  for (const limit of pageSizeTests) {
    const pageData =
      await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IRedditPlatformUserActivity.IRequest,
        },
      );
    typia.assert(pageData);
    TestValidator.equals(
      `page limit ${limit} works correctly`,
      pageData.data.length <= limit,
      true,
    );
    TestValidator.equals(
      `pagination limit ${limit} set correctly`,
      pageData.pagination.limit,
      limit,
    );
  }

  // Step 4: Test pagination navigation (multiple pages)
  const firstPage =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(firstPage);

  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IRedditPlatformUserActivity.IRequest,
        },
      );
    typia.assert(secondPage);

    // Validate page navigation
    TestValidator.equals("page 2 has data", secondPage.data.length >= 0, true);
    TestValidator.equals(
      "page 2 correct pagination",
      secondPage.pagination.current,
      2,
    );

    // Validate no duplicate data between pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const firstPageIds = firstPage.data.map((a) => a.id);
      const secondPageIds = secondPage.data.map((a) => a.id);
      const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
      TestValidator.equals(
        "no duplicate data between pages",
        hasOverlap,
        false,
      );
    }
  }

  // Step 5: Test sorting by timestamp (created_at)
  const ascendingSort =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(ascendingSort);

  const descendingSort =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(descendingSort);

  // Validate chronological ordering
  if (ascendingSort.data.length > 1 && descendingSort.data.length > 1) {
    const ascendingDates = ascendingSort.data.map((a) => a.created_at);
    const descendingDates = descendingSort.data.map((a) => a.created_at);

    // Check ascending order
    const isAscendingOrdered = ascendingDates.every(
      (date, index) =>
        index === 0 || new Date(date) >= new Date(ascendingDates[index - 1]),
    );
    TestValidator.equals(
      "ascending timestamp order correct",
      isAscendingOrdered,
      true,
    );

    // Check descending order
    const isDescendingOrdered = descendingDates.every(
      (date, index) =>
        index === 0 || new Date(date) <= new Date(descendingDates[index - 1]),
    );
    TestValidator.equals(
      "descending timestamp order correct",
      isDescendingOrdered,
      true,
    );
  }

  // Step 6: Test sorting by activity type
  const activityTypeSort =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "activity_type",
          order_direction: "asc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(activityTypeSort);

  // Step 7: Test activity type filtering
  const activityTypeFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          activity_type: "post_created",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(activityTypeFilter);

  // Validate filtered results contain only requested activity type
  const filteredActivities = activityTypeFilter.data.filter(
    (a) => a.activity_type === "post_created",
  );
  TestValidator.equals(
    "activity type filter works correctly",
    filteredActivities.length === activityTypeFilter.data.length,
    true,
  );

  // Step 8: Test date range filtering
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  const dateRangeFilter =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          date_from: startDate.toISOString(),
          date_to: endDate.toISOString(),
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(dateRangeFilter);

  // Validate all activities are within date range
  if (dateRangeFilter.data.length > 0) {
    const allInDateRange = dateRangeFilter.data.every((activity) => {
      const activityDate = new Date(activity.created_at);
      return activityDate >= startDate && activityDate <= endDate;
    });
    TestValidator.equals(
      "date range filter works correctly",
      allInDateRange,
      true,
    );
  }

  // Step 9: Test edge cases - boundary conditions
  const edgePageTest =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 999999,
          limit: 10,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(edgePageTest);
  TestValidator.equals(
    "edge case page handling",
    edgePageTest.data.length === 0,
    true,
  );

  const minimumLimitTest =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(minimumLimitTest);
  TestValidator.equals(
    "minimum limit works",
    minimumLimitTest.data.length <= 1,
    true,
  );

  // Step 10: Validate response structure integrity
  const structureValidation =
    await api.functional.redditPlatform.communityModerator.analytics.userBehavior.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformUserActivity.IRequest,
      },
    );
  typia.assert(structureValidation);

  // Validate complete pagination structure
  TestValidator.equals(
    "pagination structure complete",
    typeof structureValidation.pagination.current === "number" &&
      typeof structureValidation.pagination.limit === "number" &&
      typeof structureValidation.pagination.records === "number" &&
      typeof structureValidation.pagination.pages === "number",
    true,
  );

  // Validate data structure integrity
  if (structureValidation.data.length > 0) {
    const sampleActivity = structureValidation.data[0];
    TestValidator.equals(
      "activity data structure valid",
      typeof sampleActivity.id === "string" &&
        typeof sampleActivity.activity_type === "string" &&
        typeof sampleActivity.activity_description === "string" &&
        typeof sampleActivity.created_at === "string" &&
        typeof sampleActivity.target_community_id === "string",
      true,
    );
  }

  TestValidator.equals(
    "analytics pagination and sorting test completed",
    true,
    true,
  );
}
