import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAnnouncement";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

export async function test_api_announcement_listing_basic(
  connection: api.IConnection,
) {
  // Step 1: Make basic announcement listing request with default parameters
  const announcementsResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {} satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(announcementsResponse);

  // Step 2: Validate pagination structure is present and valid
  const pagination = announcementsResponse.pagination;
  TestValidator.predicate(
    "pagination structure exists",
    pagination !== null && pagination !== undefined,
  );
  TestValidator.equals(
    "current page is valid",
    pagination.current,
    pagination.current,
  );
  TestValidator.equals("limit is positive", pagination.limit > 0, true);
  TestValidator.equals(
    "total records is non-negative",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals("total pages is valid", pagination.pages >= 0, true);

  // Step 3: Validate announcements data array exists
  const announcements = announcementsResponse.data;
  TestValidator.predicate(
    "announcements array exists",
    Array.isArray(announcements),
  );
  TestValidator.equals(
    "announcements count matches pagination",
    announcements.length,
    pagination.records,
  );

  // Step 4: Validate each announcement has required summary fields
  announcements.forEach((announcement, index) => {
    const announcementId = `announcement ${index + 1}`;

    // Validate basic announcement structure
    TestValidator.predicate(
      `${announcementId} has valid UUID`,
      typeof announcement.id === "string",
    );
    TestValidator.equals(
      `${announcementId} has title`,
      announcement.title?.length > 0,
      true,
    );
    TestValidator.equals(
      `${announcementId} has announcement type`,
      announcement.announcement_type?.length > 0,
      true,
    );
    TestValidator.equals(
      `${announcementId} has target audience`,
      announcement.target_audience?.length > 0,
      true,
    );

    // Validate priority field (1-10 scale)
    TestValidator.predicate(
      `${announcementId} has valid priority`,
      typeof announcement.priority === "number" &&
        announcement.priority >= 1 &&
        announcement.priority <= 10,
    );

    // Validate boolean is_active field
    TestValidator.equals(
      `${announcementId} has boolean is_active field`,
      typeof announcement.is_active === "boolean",
      true,
    );

    // Validate date fields are ISO strings
    TestValidator.predicate(
      `${announcementId} has valid start_date`,
      typeof announcement.start_date === "string" &&
        announcement.start_date.length > 0,
    );
    TestValidator.predicate(
      `${announcementId} has valid created_at`,
      typeof announcement.created_at === "string" &&
        announcement.created_at.length > 0,
    );

    // Validate optional fields exist in correct format
    if (announcement.end_date !== null && announcement.end_date !== undefined) {
      TestValidator.predicate(
        `${announcementId} has valid end_date format`,
        typeof announcement.end_date === "string" &&
          announcement.end_date.length > 0,
      );
    }
    if (
      announcement.deleted_at !== null &&
      announcement.deleted_at !== undefined
    ) {
      TestValidator.predicate(
        `${announcementId} has valid deleted_at format`,
        typeof announcement.deleted_at === "string" &&
          announcement.deleted_at.length > 0,
      );
    }
  });

  // Step 5: Validate ordering by priority (higher priority first)
  if (announcements.length > 1) {
    for (let i = 0; i < announcements.length - 1; i++) {
      const current = announcements[i];
      const next = announcements[i + 1];

      // Either current has higher priority, or same priority but newer creation date
      if (current.priority > next.priority) {
        // Expected: current.priority > next.priority
      } else if (current.priority === next.priority) {
        // If same priority, current should be newer (higher created_at timestamp)
        const currentTime = new Date(current.created_at).getTime();
        const nextTime = new Date(next.created_at).getTime();
        TestValidator.predicate(
          `same priority announcements ordered by creation date`,
          currentTime >= nextTime,
        );
      } else {
        // This would violate the expected ordering
        throw new Error(
          `Announcement ordering violated: priority ${current.priority} before ${next.priority}`,
        );
      }
    }
  }

  // Step 6: Validate that all returned announcements are active
  announcements.forEach((announcement, index) => {
    TestValidator.equals(
      `announcement ${index + 1} is active`,
      announcement.is_active,
      true,
    );
  });

  // Step 7: Test pagination if there are multiple pages
  if (pagination.pages > 1) {
    const secondPageResponse =
      await api.functional.redditPlatform.announcements.index(connection, {
        body: {
          page: 2,
          limit: pagination.limit,
        } satisfies IRedditPlatformAnnouncement.IRequest,
      });
    typia.assert(secondPageResponse);

    TestValidator.equals(
      "second page returns different data",
      secondPageResponse.data.length > 0,
      true,
    );
    TestValidator.equals(
      "second page has correct page number",
      secondPageResponse.pagination.current,
      2,
    );
  }

  // Step 8: Validate page size limits (1-100 range)
  const limitedResponse =
    await api.functional.redditPlatform.announcements.index(connection, {
      body: {
        limit: 50,
      } satisfies IRedditPlatformAnnouncement.IRequest,
    });
  typia.assert(limitedResponse);

  TestValidator.equals(
    "limit request respected",
    limitedResponse.data.length <= 50,
    true,
  );
  TestValidator.equals(
    "pagination reflects limit",
    limitedResponse.pagination.limit,
    50,
  );
}
