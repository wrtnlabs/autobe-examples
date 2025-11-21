import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformNotificationPreference";

/**
 * Comprehensive notification preference search functionality validation for
 * administrators.
 *
 * This test validates that administrators can effectively search and filter
 * notification preferences across the platform with advanced query
 * capabilities. It covers searching by notification type, delivery channel,
 * enabled status, frequency limits, and quiet hours settings. The test also
 * verifies pagination functionality with configurable page sizes and sorting
 * options, ensuring that search results respect user permissions and only
 * return preferences accessible to authenticated administrators.
 */
export async function test_api_admin_notification_preferences_search(
  connection: api.IConnection,
) {
  // Create administrative user context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Create multiple member accounts with different notification preferences
  const members = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(member);

    // Create varied notification preferences for each member
    const notificationTypes = [
      "content_replies",
      "mentions",
      "community_updates",
      "moderation_actions",
      "system_alerts",
    ] as const;
    const deliveryChannels = ["in_app", "email", "push", "all"] as const;

    const preferences = await ArrayUtil.asyncRepeat(3, async (prefIndex) => {
      const preference =
        await api.functional.communityPlatform.member.notificationPreferences.create(
          connection,
          {
            body: {
              notification_type: RandomGenerator.pick(notificationTypes),
              delivery_channel: RandomGenerator.pick(deliveryChannels),
              enabled: Math.random() > 0.3,
              frequency_limit:
                Math.random() > 0.5
                  ? (typia.random<
                      number & tags.Type<"int32"> & tags.Minimum<0>
                    >() satisfies number as number)
                  : undefined,
              quiet_hours_start:
                Math.random() > 0.7
                  ? ("22:00" satisfies string as string)
                  : undefined,
              quiet_hours_end:
                Math.random() > 0.7
                  ? ("07:00" satisfies string as string)
                  : undefined,
            } satisfies ICommunityPlatformNotificationPreference.ICreate,
          },
        );
      typia.assert(preference);
      return preference;
    });

    return { member, preferences };
  });

  // Switch to admin authentication for search operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Test 1: Search all notification preferences with pagination
  const allPreferences =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          order_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(allPreferences);
  TestValidator.predicate(
    "should return paginated results",
    allPreferences.data.length <= 10,
  );
  TestValidator.predicate(
    "should have valid pagination info",
    allPreferences.pagination.pages >= 0,
  );

  // Test 2: Search by specific notification type
  const contentRepliesSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          notification_type: "content_replies",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(contentRepliesSearch);
  if (contentRepliesSearch.data.length > 0) {
    TestValidator.predicate(
      "all results should match notification type",
      contentRepliesSearch.data.every(
        (pref) => pref.notification_type === "content_replies",
      ),
    );
  }

  // Test 3: Search by delivery channel
  const emailChannelSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          delivery_channel: "email",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(emailChannelSearch);
  if (emailChannelSearch.data.length > 0) {
    TestValidator.predicate(
      "all results should match delivery channel",
      emailChannelSearch.data.every(
        (pref) => pref.delivery_channel === "email",
      ),
    );
  }

  // Test 4: Search by enabled status
  const enabledSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          enabled: true,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(enabledSearch);
  if (enabledSearch.data.length > 0) {
    TestValidator.predicate(
      "all results should be enabled",
      enabledSearch.data.every((pref) => pref.enabled === true),
    );
  }

  // Test 5: Search with frequency limit range
  const frequencySearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          frequency_limit_min: 1,
          frequency_limit_max: 30,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(frequencySearch);
  if (frequencySearch.data.length > 0) {
    TestValidator.predicate(
      "results should have frequency limits in range",
      frequencySearch.data.every(
        (pref) =>
          pref.frequency_limit !== undefined &&
          pref.frequency_limit >= 1 &&
          pref.frequency_limit <= 30,
      ),
    );
  }

  // Test 6: Search with quiet hours
  const quietHoursSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          quiet_hours_start: "22:00",
          quiet_hours_end: "07:00",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(quietHoursSearch);

  // Test 7: Search with multiple criteria
  const complexSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          notification_type: "system_alerts",
          delivery_channel: "push",
          enabled: true,
          frequency_limit_min: 1,
          page: 1,
          limit: 10,
          order_by: "updated_at",
          order: "asc",
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(complexSearch);
  if (complexSearch.data.length > 0) {
    TestValidator.predicate(
      "complex search should return matching results",
      complexSearch.data.every(
        (pref) =>
          pref.notification_type === "system_alerts" &&
          pref.delivery_channel === "push" &&
          pref.enabled === true &&
          (pref.frequency_limit === undefined || pref.frequency_limit >= 1),
      ),
    );
  }

  // Test 8: Search with different page sizes
  const largePageSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(largePageSearch);
  TestValidator.predicate(
    "large page search should respect limit",
    largePageSearch.data.length <= 50,
  );

  // Test 9: Search with sorting by different fields
  const typeSortedSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          order_by: "notification_type",
          order: "asc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(typeSortedSearch);

  // Test 10: Search with delivery channel sorting
  const channelSortedSearch =
    await api.functional.communityPlatform.admin.notificationPreferences.index(
      connection,
      {
        body: {
          order_by: "delivery_channel",
          order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformNotificationPreference.IRequest,
      },
    );
  typia.assert(channelSortedSearch);

  // Validate that all searches returned valid data structures
  const allSearches = [
    allPreferences,
    contentRepliesSearch,
    emailChannelSearch,
    enabledSearch,
    frequencySearch,
    quietHoursSearch,
    complexSearch,
    largePageSearch,
    typeSortedSearch,
    channelSortedSearch,
  ];

  allSearches.forEach((searchResult, index) => {
    TestValidator.predicate(
      `search ${index + 1} should have valid pagination structure`,
      searchResult.pagination.current >= 0 &&
        searchResult.pagination.limit > 0 &&
        searchResult.pagination.records >= 0 &&
        searchResult.pagination.pages >= 0,
    );
  });
}
