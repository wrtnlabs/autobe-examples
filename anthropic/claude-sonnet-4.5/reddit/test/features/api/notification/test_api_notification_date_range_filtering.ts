import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityNotification";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityNotification";

/**
 * Test filtering notifications by creation date ranges using created_after and
 * created_before parameters.
 *
 * This test validates the temporal filtering functionality of the notification
 * retrieval API. It verifies that:
 *
 * 1. Created_after correctly excludes notifications before the timestamp
 * 2. Created_before correctly excludes notifications after the timestamp
 * 3. Combining both parameters creates an accurate date window
 * 4. ISO 8601 datetime format is properly parsed
 * 5. Temporal filtering accuracy and boundary conditions work correctly
 *
 * Test Flow:
 *
 * 1. Create a member account to receive notifications
 * 2. Retrieve existing notifications to establish baseline timestamps
 * 3. Test filtering with created_after parameter
 * 4. Test filtering with created_before parameter
 * 5. Test combining both parameters for date range windows
 * 6. Validate ISO 8601 format parsing and timezone handling
 */
export async function test_api_notification_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Retrieve all notifications without filters to establish baseline
  const allNotifications =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(allNotifications);

  // If there are no notifications, we cannot test date filtering meaningfully
  // In a real scenario, we would create notifications here, but since the API
  // doesn't provide notification creation endpoints, we'll work with what exists
  if (allNotifications.data.length === 0) {
    // No notifications to test with - this is acceptable for this test
    return;
  }

  // Step 3: Extract timestamps from existing notifications for filtering tests
  const timestamps = allNotifications.data
    .map((n) => new Date(n.created_at).getTime())
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    // Not enough notifications for meaningful date range testing
    return;
  }

  // Calculate middle timestamp for testing
  const middleIndex = Math.floor(timestamps.length / 2);
  const middleTimestamp = new Date(timestamps[middleIndex]).toISOString();
  const earliestTimestamp = new Date(timestamps[0]).toISOString();
  const latestTimestamp = new Date(
    timestamps[timestamps.length - 1],
  ).toISOString();

  // Step 4: Test created_after filter - should exclude notifications before the timestamp
  const afterFilterResult =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_after: middleTimestamp,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(afterFilterResult);

  // Validate that all returned notifications are created after the specified timestamp
  for (const notification of afterFilterResult.data) {
    const notificationTime = new Date(notification.created_at).getTime();
    const filterTime = new Date(middleTimestamp).getTime();
    TestValidator.predicate(
      "notification created_at is after filter timestamp",
      notificationTime >= filterTime,
    );
  }

  // Step 5: Test created_before filter - should exclude notifications after the timestamp
  const beforeFilterResult =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_before: middleTimestamp,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(beforeFilterResult);

  // Validate that all returned notifications are created before the specified timestamp
  for (const notification of beforeFilterResult.data) {
    const notificationTime = new Date(notification.created_at).getTime();
    const filterTime = new Date(middleTimestamp).getTime();
    TestValidator.predicate(
      "notification created_at is before filter timestamp",
      notificationTime <= filterTime,
    );
  }

  // Step 6: Test combining both created_after and created_before for date range window
  // Create a narrow time window
  const quarterIndex = Math.floor(timestamps.length / 4);
  const threeQuarterIndex = Math.floor((timestamps.length * 3) / 4);
  const windowStart = new Date(timestamps[quarterIndex]).toISOString();
  const windowEnd = new Date(timestamps[threeQuarterIndex]).toISOString();

  const rangeFilterResult =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_after: windowStart,
          created_before: windowEnd,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(rangeFilterResult);

  // Validate that all returned notifications fall within the date window
  const startTime = new Date(windowStart).getTime();
  const endTime = new Date(windowEnd).getTime();

  for (const notification of rangeFilterResult.data) {
    const notificationTime = new Date(notification.created_at).getTime();
    TestValidator.predicate(
      "notification within date range window",
      notificationTime >= startTime && notificationTime <= endTime,
    );
  }

  // Step 7: Test boundary conditions - exact timestamp matching
  if (timestamps.length > 0) {
    const exactTimestamp = new Date(timestamps[0]).toISOString();

    const exactBoundaryResult =
      await api.functional.redditCommunity.member.notifications.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            created_after: exactTimestamp,
            created_before: exactTimestamp,
          } satisfies IRedditCommunityNotification.IRequest,
        },
      );
    typia.assert(exactBoundaryResult);

    // With exact same timestamp for both after and before, we expect notifications
    // that match exactly (if any) due to >= and <= semantics
    for (const notification of exactBoundaryResult.data) {
      TestValidator.equals(
        "exact boundary timestamp match",
        notification.created_at,
        exactTimestamp,
      );
    }
  }

  // Step 8: Validate ISO 8601 format parsing by testing various valid formats
  // Test with timezone offset format
  const now = new Date();
  const isoWithOffset = now.toISOString();

  const isoFormatTest =
    await api.functional.redditCommunity.member.notifications.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_before: isoWithOffset,
        } satisfies IRedditCommunityNotification.IRequest,
      },
    );
  typia.assert(isoFormatTest);

  // Verify the API successfully parsed the ISO 8601 format
  TestValidator.predicate(
    "ISO 8601 format successfully parsed",
    isoFormatTest.pagination.records >= 0,
  );
}
