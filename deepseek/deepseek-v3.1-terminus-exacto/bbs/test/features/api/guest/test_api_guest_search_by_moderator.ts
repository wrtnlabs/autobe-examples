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
 * Test the search and retrieval of guest accounts by an authenticated
 * moderator.
 *
 * This comprehensive test validates the moderator's ability to search and
 * filter guest accounts using various criteria including date ranges, guest
 * token patterns, and pagination parameters. The test creates a moderator
 * account, creates multiple guest accounts with different characteristics, and
 * then performs various search operations to verify that filtering, pagination,
 * and sorting work correctly.
 */
export async function test_api_guest_search_by_moderator(
  connection: api.IConnection,
) {
  // Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: "moderator123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      moderation_level: "admin",
      ip: "127.0.0.1",
      href: "https://discussionboard.test/admin",
      referrer: "https://discussionboard.test",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Create multiple guest accounts with different creation timestamps
  const guests: IDiscussionBoardGuest.IAuthorized[] = [];

  // Create guest accounts with varying timestamps and tokens
  for (let i = 0; i < 5; i++) {
    const guest = await api.functional.auth.guest.join(connection);
    typia.assert(guest);
    guests.push(guest);

    // Add small delay to ensure different timestamps
    if (i < 4) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Test 1: Basic pagination - get first page
  const firstPage = await api.functional.discussionBoard.moderator.guests.index(
    connection,
    {
      body: {
        pagination: {
          current: 0,
          limit: 3,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(firstPage);

  TestValidator.predicate(
    "first page should have data",
    firstPage.data.length > 0,
  );
  TestValidator.predicate(
    "pagination records should be set by server",
    firstPage.pagination.records >= firstPage.data.length,
  );

  // Test 2: Search by partial guest token
  const searchToken = guests[0].guest_token.substring(0, 8);
  const searchResults =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        pagination: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        search: searchToken,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search should find matching guest",
    searchResults.data.some((guest) => guest.guest_token.includes(searchToken)),
  );

  // Test 3: Date range filtering
  const earliestGuest = guests[0];
  const latestGuest = guests[guests.length - 1];

  const dateFilteredResults =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        pagination: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        created_after: earliestGuest.created_at,
        created_before: latestGuest.created_at,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(dateFilteredResults);

  TestValidator.predicate(
    "date filtered results should contain guests",
    dateFilteredResults.data.length > 0,
  );

  // Verify date filtering actually worked
  if (dateFilteredResults.data.length > 0) {
    const sampleGuest = dateFilteredResults.data[0];
    const guestDate = new Date(sampleGuest.created_at);
    const startDate = new Date(earliestGuest.created_at);
    const endDate = new Date(latestGuest.created_at);

    TestValidator.predicate(
      "filtered guest should be within date range",
      guestDate >= startDate && guestDate <= endDate,
    );
  }

  // Test 4: Sorting by creation date descending
  const sortedResults =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        pagination: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        sort_by: "created_at",
        order: "desc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(sortedResults);

  if (sortedResults.data.length > 1) {
    const firstDate = new Date(sortedResults.data[0].created_at);
    const secondDate = new Date(sortedResults.data[1].created_at);
    TestValidator.predicate(
      "results should be sorted descending by creation date",
      firstDate >= secondDate,
    );
  } else {
    TestValidator.predicate(
      "sorted results should contain data",
      sortedResults.data.length > 0,
    );
  }

  // Test 5: Empty search term should return all guests
  const allGuests = await api.functional.discussionBoard.moderator.guests.index(
    connection,
    {
      body: {
        pagination: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        search: "",
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(allGuests);

  TestValidator.predicate(
    "empty search should return guests",
    allGuests.data.length > 0,
  );

  // Test 6: Pagination with different page sizes
  const smallPage = await api.functional.discussionBoard.moderator.guests.index(
    connection,
    {
      body: {
        pagination: {
          current: 0,
          limit: 2,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IDiscussionBoardGuest.IRequest,
    },
  );
  typia.assert(smallPage);

  TestValidator.predicate(
    "small page size should limit results",
    smallPage.data.length <= 2,
  );

  // Verify that all created guest accounts can be found in search results
  const comprehensiveSearch =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        pagination: {
          current: 0,
          limit: 20,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(comprehensiveSearch);

  // Check that our created guests appear in the results
  const foundGuestIds = new Set(
    comprehensiveSearch.data.map((guest) => guest.id),
  );
  const createdGuestIds = guests.map((guest) => guest.id);

  TestValidator.predicate(
    "created guests should be found in search results",
    createdGuestIds.some((id) => foundGuestIds.has(id)),
  );

  // Test 7: Sorting by guest token
  const tokenSortedResults =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        pagination: {
          current: 0,
          limit: 10,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
        sort_by: "guest_token",
        order: "asc",
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(tokenSortedResults);

  if (tokenSortedResults.data.length > 1) {
    const firstToken = tokenSortedResults.data[0].guest_token;
    const secondToken = tokenSortedResults.data[1].guest_token;
    TestValidator.predicate(
      "results should be sorted ascending by guest token",
      firstToken <= secondToken,
    );
  }
}
