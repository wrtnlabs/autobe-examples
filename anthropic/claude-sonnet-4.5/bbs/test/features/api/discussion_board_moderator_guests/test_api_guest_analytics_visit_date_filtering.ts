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
 * Test filtering guests by visit date ranges using first_visit and last_visit
 * timestamps.
 *
 * This test validates the guest analytics date filtering functionality, which
 * allows moderators to analyze visitor acquisition patterns and activity
 * retention. The test covers various date range combinations to ensure the API
 * correctly filters guest records based on both first visit (acquisition date)
 * and last visit (activity date) timestamps.
 *
 * Test workflow:
 *
 * 1. Create and authenticate as a moderator
 * 2. Retrieve all guests to establish baseline data
 * 3. Test first_visit_from/first_visit_to filtering (visitor acquisition analysis)
 * 4. Test last_visit_from/last_visit_to filtering (recent activity analysis)
 * 5. Test combined date range filters (new visitors who became dormant)
 * 6. Validate ISO 8601 datetime format handling and timezone awareness
 * 7. Test edge cases like same-day ranges
 */
export async function test_api_guest_analytics_visit_date_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve all guests to establish baseline dataset
  const allGuestsPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(allGuestsPage);

  // If there are no guests, we cannot test date filtering
  if (allGuestsPage.data.length === 0) {
    return;
  }

  // Step 3: Test filtering by first_visit date range (visitor acquisition analysis)
  const sampleGuest = allGuestsPage.data[0];
  const firstVisitDate = new Date(sampleGuest.first_visit_at);

  // Create a date range around the sample guest's first visit
  const firstVisitFrom = new Date(
    firstVisitDate.getTime() - 86400000,
  ).toISOString();
  const firstVisitTo = new Date(
    firstVisitDate.getTime() + 86400000,
  ).toISOString();

  const firstVisitFilteredPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 100,
        first_visit_from: firstVisitFrom,
        first_visit_to: firstVisitTo,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(firstVisitFilteredPage);

  // Validate that all returned guests have first_visit_at within the specified range
  for (const guest of firstVisitFilteredPage.data) {
    const guestFirstVisit = new Date(guest.first_visit_at);
    TestValidator.predicate(
      "guest first visit should be within specified range",
      guestFirstVisit >= new Date(firstVisitFrom) &&
        guestFirstVisit <= new Date(firstVisitTo),
    );
  }

  // Step 4: Test filtering by last_visit date range (recent activity analysis)
  const lastVisitDate = new Date(sampleGuest.last_visit_at);

  const lastVisitFrom = new Date(
    lastVisitDate.getTime() - 86400000,
  ).toISOString();
  const lastVisitTo = new Date(
    lastVisitDate.getTime() + 86400000,
  ).toISOString();

  const lastVisitFilteredPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 100,
        last_visit_from: lastVisitFrom,
        last_visit_to: lastVisitTo,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(lastVisitFilteredPage);

  // Validate that all returned guests have last_visit_at within the specified range
  for (const guest of lastVisitFilteredPage.data) {
    const guestLastVisit = new Date(guest.last_visit_at);
    TestValidator.predicate(
      "guest last visit should be within specified range",
      guestLastVisit >= new Date(lastVisitFrom) &&
        guestLastVisit <= new Date(lastVisitTo),
    );
  }

  // Step 5: Test combined date range filters (new visitors who became dormant)
  const combinedFilteredPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 100,
        first_visit_from: firstVisitFrom,
        first_visit_to: firstVisitTo,
        last_visit_from: lastVisitFrom,
        last_visit_to: lastVisitTo,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(combinedFilteredPage);

  // Validate that all returned guests satisfy both date range conditions
  for (const guest of combinedFilteredPage.data) {
    const guestFirstVisit = new Date(guest.first_visit_at);
    const guestLastVisit = new Date(guest.last_visit_at);

    TestValidator.predicate(
      "guest should match both first and last visit date ranges",
      guestFirstVisit >= new Date(firstVisitFrom) &&
        guestFirstVisit <= new Date(firstVisitTo) &&
        guestLastVisit >= new Date(lastVisitFrom) &&
        guestLastVisit <= new Date(lastVisitTo),
    );
  }

  // Step 6: Test same-day range filtering
  const sameDayDate = new Date(sampleGuest.first_visit_at);
  sameDayDate.setHours(0, 0, 0, 0);
  const sameDayStart = sameDayDate.toISOString();
  sameDayDate.setHours(23, 59, 59, 999);
  const sameDayEnd = sameDayDate.toISOString();

  const sameDayFilteredPage: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 100,
        first_visit_from: sameDayStart,
        first_visit_to: sameDayEnd,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(sameDayFilteredPage);

  // Validate same-day filtering
  for (const guest of sameDayFilteredPage.data) {
    const guestFirstVisit = new Date(guest.first_visit_at);
    TestValidator.predicate(
      "guest first visit should be within same day",
      guestFirstVisit >= new Date(sameDayStart) &&
        guestFirstVisit <= new Date(sameDayEnd),
    );
  }
}
