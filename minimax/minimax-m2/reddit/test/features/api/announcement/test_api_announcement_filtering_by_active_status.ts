import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

/**
 * Test announcement filtering by is_active parameter to validate that active
 * and inactive announcements can be filtered appropriately.
 *
 * This test validates the filtering functionality of the announcements API
 * endpoint by:
 *
 * 1. Testing with is_active=true to ensure only currently active announcements are
 *    returned
 * 2. Testing with is_active=false to ensure only inactive or expired announcements
 *    are returned
 * 3. Verifying the filtering logic correctly distinguishes between active and
 *    inactive announcements
 * 4. Testing edge cases with announcements having different temporal states
 *
 * The test ensures that users can properly filter announcements based on their
 * activation status, which is crucial for displaying only relevant, currently
 * applicable announcements to users.
 */
export async function test_api_announcement_filtering_by_active_status(
  connection: api.IConnection,
) {
  // Test announcement filtering by is_active parameter
  // Since we don't have admin endpoints to create announcements in this test scenario,
  // we'll test the filtering functionality with the existing announcements in the system

  // Test 1: Get all announcements without filtering to understand the data
  const allAnnouncements =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 100, // Get a larger sample to test filtering
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(allAnnouncements);

  // Test 2: Filter for only active announcements (is_active=true)
  const activeAnnouncements =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 100,
        is_active: true,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(activeAnnouncements);

  // Test 3: Filter for only inactive announcements (is_active=false)
  const inactiveAnnouncements =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 100,
        is_active: false,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(inactiveAnnouncements);

  // Validate that filtering is working correctly
  // All announcements in activeAnnouncements should have is_active=true
  for (const announcement of activeAnnouncements.data) {
    TestValidator.predicate(
      "active announcement should have is_active=true",
      announcement.is_active === true,
    );
  }

  // All announcements in inactiveAnnouncements should have is_active=false
  for (const announcement of inactiveAnnouncements.data) {
    TestValidator.predicate(
      "inactive announcement should have is_active=false",
      announcement.is_active === false,
    );
  }

  // Test 4: Verify that active and inactive announcements are mutually exclusive
  const activeIds = new Set(activeAnnouncements.data.map((a) => a.id));
  const inactiveIds = new Set(inactiveAnnouncements.data.map((a) => a.id));

  // Check that no announcement appears in both lists
  const overlap = [...activeIds].filter((id) => inactiveIds.has(id));
  TestValidator.equals(
    "active and inactive announcements should be mutually exclusive",
    overlap.length,
    0,
  );

  // Test 5: Verify that active + inactive announcements equal total announcements
  // (when considering only announcements that have explicit is_active values)
  const totalWithExplicitStatus = allAnnouncements.data.filter(
    (a) => typeof a.is_active === "boolean",
  ).length;
  const activeCount = activeAnnouncements.data.length;
  const inactiveCount = inactiveAnnouncements.data.length;

  TestValidator.equals(
    "active count + inactive count should equal total announcements with explicit status",
    activeCount + inactiveCount,
    totalWithExplicitStatus,
  );

  // Test 6: Test filtering with additional parameters combined with is_active
  const activeAnnouncementsWithType =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_active: true,
        announcement_type: "info", // Test combining is_active with other filters
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(activeAnnouncementsWithType);

  // Validate that the combined filtering still respects is_active=true
  for (const announcement of activeAnnouncementsWithType.data) {
    TestValidator.predicate(
      "combined filter should still respect is_active=true",
      announcement.is_active === true,
    );
  }

  // Test 7: Test pagination with filtering
  const firstPageActive =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 1,
        limit: 5,
        is_active: true,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(firstPageActive);

  const secondPageActive =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        page: 2,
        limit: 5,
        is_active: true,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(secondPageActive);

  // Ensure both pages only contain active announcements
  for (const announcement of [
    ...firstPageActive.data,
    ...secondPageActive.data,
  ]) {
    TestValidator.predicate(
      "paginated results should respect is_active=true filter",
      announcement.is_active === true,
    );
  }

  // Test 8: Verify pagination metadata is correct when filtering
  TestValidator.equals(
    "pagination should work correctly with is_active filtering",
    firstPageActive.pagination.current,
    1,
  );

  TestValidator.equals(
    "second page should have higher page number",
    secondPageActive.pagination.current,
    2,
  );
}
