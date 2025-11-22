import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

export async function test_api_announcement_filtering_by_priority_range(
  connection: api.IConnection,
) {
  // Step 1: Get baseline announcements without any priority filters
  const baselineResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {} satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(baselineResponse);

  // Step 2: Test filtering with specific priority range (3-7)
  const rangeResponse = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        priority_min: 3,
        priority_max: 7,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(rangeResponse);

  // Validate that the range-filtered results are a subset of baseline
  TestValidator.predicate(
    "range filtered results should be subset of baseline",
    rangeResponse.data.every((announcement) =>
      baselineResponse.data.some((baseline) => baseline.id === announcement.id),
    ),
  );

  // Step 3: Test filtering with only priority_min (5+)
  const minOnlyResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        priority_min: 5,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(minOnlyResponse);

  // Step 4: Test filtering with only priority_max (4 or less)
  const maxOnlyResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        priority_max: 4,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(maxOnlyResponse);

  // Step 5: Test edge case with minimum priority (1)
  const minPriorityResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        priority_min: 1,
        priority_max: 2,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(minPriorityResponse);

  // Step 6: Test edge case with maximum priority (10)
  const maxPriorityResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        priority_min: 9,
        priority_max: 10,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(maxPriorityResponse);

  // Step 7: Validate priority values are within specified ranges
  TestValidator.predicate(
    "range response announcements should have priorities between 3-7",
    rangeResponse.data.every(
      (announcement) =>
        announcement.priority >= 3 && announcement.priority <= 7,
    ),
  );

  TestValidator.predicate(
    "min-only response announcements should have priority >= 5",
    minOnlyResponse.data.every((announcement) => announcement.priority >= 5),
  );

  TestValidator.predicate(
    "max-only response announcements should have priority <= 4",
    maxOnlyResponse.data.every((announcement) => announcement.priority <= 4),
  );

  TestValidator.predicate(
    "min priority response announcements should have priorities 1-2",
    minPriorityResponse.data.every(
      (announcement) =>
        announcement.priority >= 1 && announcement.priority <= 2,
    ),
  );

  TestValidator.predicate(
    "max priority response announcements should have priorities 9-10",
    maxPriorityResponse.data.every(
      (announcement) =>
        announcement.priority >= 9 && announcement.priority <= 10,
    ),
  );

  // Step 8: Validate pagination structure is maintained
  TestValidator.equals(
    "pagination structure preserved for range filtering",
    baselineResponse.pagination.current,
    rangeResponse.pagination.current,
  );

  TestValidator.equals(
    "pagination limit preserved for range filtering",
    baselineResponse.pagination.limit,
    rangeResponse.pagination.limit,
  );

  // Step 9: Test overlapping ranges to verify proper filtering
  const overlapTest = await api.functional.redditPlatform.announcements.index(
    connection,
    {
      body: {
        priority_min: 4,
        priority_max: 6,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    },
  );
  typia.assert(overlapTest);

  // Verify overlap with previous range test (3-7 vs 4-6)
  TestValidator.predicate(
    "overlapping range should be subset of larger range",
    overlapTest.data.every((announcement) =>
      rangeResponse.data.some(
        (rangeAnnouncement) => rangeAnnouncement.id === announcement.id,
      ),
    ),
  );
}
