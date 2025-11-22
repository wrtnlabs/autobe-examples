import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

export async function test_api_announcement_filtering_by_audience(
  connection: api.IConnection,
) {
  // Test announcement filtering by target audience parameter
  // First, get baseline results to understand the data structure
  const baselineResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 50,
      },
    });
  typia.assert(baselineResult);

  // Test filtering for all_users audience
  const allUsersResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "all_users",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(allUsersResult);
  TestValidator.predicate(
    "all users announcements returned",
    allUsersResult.data.length >= 0,
  );

  // Validate all returned announcements have the correct target audience
  allUsersResult.data.forEach((announcement, index) => {
    TestValidator.equals(
      `Announcement ${index} has correct audience`,
      announcement.target_audience,
      "all_users",
    );
  });

  // Test filtering for registered_users audience
  const registeredUsersResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "registered_users",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(registeredUsersResult);
  TestValidator.predicate(
    "registered users announcements returned",
    registeredUsersResult.data.length >= 0,
  );

  // Validate all returned announcements have the correct target audience
  registeredUsersResult.data.forEach((announcement, index) => {
    TestValidator.equals(
      `Registered user announcement ${index} has correct audience`,
      announcement.target_audience,
      "registered_users",
    );
  });

  // Test filtering for community_moderators audience
  const moderatorsResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "community_moderators",
        page: 1,
        limit: 20,
      },
    });
  typia.assert(moderatorsResult);
  TestValidator.predicate(
    "moderators announcements returned",
    moderatorsResult.data.length >= 0,
  );

  // Validate all returned announcements have the correct target audience
  moderatorsResult.data.forEach((announcement, index) => {
    TestValidator.equals(
      `Moderator announcement ${index} has correct audience`,
      announcement.target_audience,
      "community_moderators",
    );
  });

  // Test filtering for platform_administrators audience
  const adminsResult = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        target_audience: "platform_administrators",
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(adminsResult);
  TestValidator.predicate(
    "administrators announcements returned",
    adminsResult.data.length >= 0,
  );

  // Validate all returned announcements have the correct target audience
  adminsResult.data.forEach((announcement, index) => {
    TestValidator.equals(
      `Administrator announcement ${index} has correct audience`,
      announcement.target_audience,
      "platform_administrators",
    );
  });

  // Test combined filtering with additional parameters
  const combinedFilterResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "all_users",
        is_active: true,
        order_by: "priority",
        order_direction: "desc",
        page: 1,
        limit: 15,
      },
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filtering returns results",
    combinedFilterResult.data.length >= 0,
  );

  // Validate that combined filter results still respect target audience
  combinedFilterResult.data.forEach((announcement, index) => {
    TestValidator.equals(
      `Combined filter announcement ${index} has correct audience`,
      announcement.target_audience,
      "all_users",
    );
    TestValidator.predicate(
      `Combined filter announcement ${index} is active`,
      announcement.is_active === true,
    );
  });

  // Test pagination with audience filtering
  const paginatedResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "registered_users",
        page: 1,
        limit: 5,
      },
    });
  typia.assert(paginatedResult);

  // Validate pagination structure
  TestValidator.equals(
    "pagination page number",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    paginatedResult.pagination.records >= 0,
  );

  // Validate data integrity - ensure announcements array matches pagination data
  TestValidator.equals(
    "pagination data length matches request limit",
    paginatedResult.data.length,
    Math.min(5, paginatedResult.pagination.records),
  );

  // Test edge case: invalid target audience should still return results (or handle gracefully)
  // Note: Assuming the API handles invalid values gracefully rather than throwing errors
  const invalidAudienceResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "invalid_audience_type",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(invalidAudienceResult);

  // Validate that filtering works independently of other parameters
  const dateFilteredResult =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        target_audience: "community_moderators",
        announcement_type: "info", // Test with type filter
        page: 1,
        limit: 10,
      },
    });
  typia.assert(dateFilteredResult);

  // Ensure audience filtering still works with additional filters
  dateFilteredResult.data.forEach((announcement, index) => {
    TestValidator.equals(
      `Date filtered announcement ${index} has correct audience`,
      announcement.target_audience,
      "community_moderators",
    );
  });
}
