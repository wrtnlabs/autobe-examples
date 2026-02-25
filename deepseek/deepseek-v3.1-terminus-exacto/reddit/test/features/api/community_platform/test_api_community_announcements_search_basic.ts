import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test basic announcement search functionality with pagination.
 * Verifies that the endpoint returns a paginated list of published announcements
 * when no filters are applied. Checks pagination metadata includes correct
 * current page, limit, total records, and total pages. Validates that
 * announcements are sorted by pinned status (pinned first) then creation date
 * (newest first). Each announcement summary should include required fields
 * with author details showing user summary information.
 */
export async function test_api_community_announcements_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Use a random community ID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Test basic search without any filters (empty request)
  const result =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          // No filters applied - should return all published announcements
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination metadata structure
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    result.pagination.pages >= 0,
  );
  // Validate pagination calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pages should be calculated correctly",
    result.pagination.pages,
    expectedPages,
  );
  // Validate announcement structure for each item
  for (const announcement of result.data) {
    typia.assert(announcement);
    // Validate required fields exist (type safety already ensured by typia.assert)
    TestValidator.predicate(
      "announcement should have valid UUID id",
      announcement.id.length > 0,
    );
    TestValidator.predicate(
      "announcement should have title",
      announcement.title.length > 0,
    );
    TestValidator.predicate(
      "announcement should have valid is_pinned boolean",
      typeof announcement.is_pinned === "boolean",
    );
    TestValidator.predicate(
      "announcement should have status",
      announcement.status.length > 0,
    );
    TestValidator.predicate(
      "announcement should have valid ISO date-time",
      announcement.created_at.length > 0,
    );
    // Validate author structure
    typia.assert(announcement.author);
    TestValidator.predicate(
      "author should have valid UUID id",
      announcement.author.id.length > 0,
    );
    TestValidator.predicate(
      "author should have username",
      announcement.author.username.length > 0,
    );
    TestValidator.predicate(
      "author should have valid karma integer",
      Number.isInteger(announcement.author.karma),
    );
    TestValidator.predicate(
      "author should have valid ISO date-time",
      announcement.author.created_at.length > 0,
    );
  }
  // Validate sorting: pinned announcements first, then by creation date (newest first)
  if (result.data.length > 1) {
    let foundUnpinned = false;
    for (let i = 0; i < result.data.length; i++) {
      const current = result.data[i];
      if (!current.is_pinned) {
        foundUnpinned = true;
      }
      // Once we find an unpinned announcement, all subsequent should be unpinned
      if (foundUnpinned) {
        TestValidator.predicate(
          "unpinned announcements should come after pinned",
          !current.is_pinned,
        );
      }
      // Validate creation date ordering for announcements with same pinned status
      if (i > 0 && result.data[i - 1].is_pinned === current.is_pinned) {
        try {
          const prevDate = new Date(result.data[i - 1].created_at);
          const currDate = new Date(current.created_at);
          TestValidator.predicate(
            "announcements should be sorted newest first",
            prevDate >= currDate,
          );
        } catch {
          // If date parsing fails, skip this validation
        }
      }
    }
  }
  // Test pagination with different page and limit
  const result2 =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(result2);
  // Validate second page pagination
  TestValidator.equals(
    "current page should be 2",
    result2.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 5", result2.pagination.limit, 5);
  TestValidator.equals(
    "total records should match first query",
    result2.pagination.records,
    result.pagination.records,
  );
  // Test empty search with limit 1 to verify pagination edge case
  const result3 =
    await api.functional.communityPlatform.communities.announcements.index(
      connection,
      {
        communityId,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunityAnnouncement.IRequest,
      },
    );
  typia.assert(result3);
  // Validate data length does not exceed limit
  TestValidator.predicate(
    "data length should not exceed limit",
    result3.data.length <= result3.pagination.limit,
  );
}
