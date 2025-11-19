import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";

/**
 * Test filtering guests by page view engagement thresholds to analyze visitor
 * behavior patterns and conversion potential.
 *
 * This comprehensive test validates the guest analytics API's ability to
 * segment visitors based on their engagement level (measured by page views) for
 * targeted marketing and conversion optimization.
 *
 * The test follows this workflow:
 *
 * 1. Create and authenticate a moderator account with necessary permissions to
 *    access guest analytics
 * 2. Test highly engaged visitors filter (min_page_views >= 50) - identifies power
 *    users with strong conversion potential
 * 3. Test low engagement visitors filter (max_page_views <= 5) - identifies users
 *    with minimal exploration
 * 4. Test specific engagement tier analysis (min 10 to max 50 page views) -
 *    analyzes moderate engagement segment
 * 5. Validate that all returned guest records have page_views within the specified
 *    ranges
 * 6. Verify pagination and response structure integrity
 */
export async function test_api_guest_analytics_engagement_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<20>
        >(),
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test highly engaged visitors filter (min_page_views >= 50)
  const highEngagementGuests: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        min_page_views: 50,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(highEngagementGuests);

  // Validate all returned guests have page_views >= 50
  for (const guest of highEngagementGuests.data) {
    TestValidator.predicate(
      "high engagement guest has at least 50 page views",
      guest.page_views >= 50,
    );
  }

  // Step 3: Test low engagement visitors filter (max_page_views <= 5)
  const lowEngagementGuests: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        max_page_views: 5,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(lowEngagementGuests);

  // Validate all returned guests have page_views <= 5
  for (const guest of lowEngagementGuests.data) {
    TestValidator.predicate(
      "low engagement guest has at most 5 page views",
      guest.page_views <= 5,
    );
  }

  // Step 4: Test specific engagement tier (10 to 50 page views)
  const moderateEngagementGuests: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        min_page_views: 10,
        max_page_views: 50,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(moderateEngagementGuests);

  // Validate all returned guests have page_views between 10 and 50
  for (const guest of moderateEngagementGuests.data) {
    TestValidator.predicate(
      "moderate engagement guest has page views between 10 and 50",
      guest.page_views >= 10 && guest.page_views <= 50,
    );
  }

  // Step 5: Verify pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    highEngagementGuests.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    highEngagementGuests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    highEngagementGuests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    highEngagementGuests.pagination.pages >= 0,
  );
}
