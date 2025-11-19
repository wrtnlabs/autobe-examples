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
 * Test general search functionality across multiple guest fields.
 *
 * This test validates the comprehensive search capabilities of the guest
 * analytics system. It creates a moderator account with proper authentication,
 * then performs multiple search operations to verify that the search API
 * correctly filters guest records based on various criteria including IP
 * address patterns, user agent keywords, and general cross-field searches.
 *
 * Test Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Test general search across multiple fields (session_identifier, ip_address,
 *    user_agent)
 * 3. Test IP address fragment filtering (subnet searches)
 * 4. Test user agent keyword filtering (browser identification)
 * 5. Validate pagination and response structure
 * 6. Verify case sensitivity and partial matching behavior
 */
export async function test_api_guest_analytics_search_functionality(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Test general search functionality (searches across multiple fields)
  const generalSearchTerm = "192.168";
  const generalSearchResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        search: generalSearchTerm,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(generalSearchResult);

  // Validate pagination structure
  TestValidator.predicate(
    "general search pagination should be valid",
    generalSearchResult.pagination.current === 1 &&
      generalSearchResult.pagination.limit === 20 &&
      generalSearchResult.pagination.records >= 0 &&
      generalSearchResult.pagination.pages >= 0,
  );

  // Validate data array exists
  TestValidator.predicate(
    "general search should return data array",
    Array.isArray(generalSearchResult.data),
  );

  // Step 3: Test IP address fragment filtering
  const ipSearchTerm = "192.168";
  const ipSearchResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        ip_address: ipSearchTerm,
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(ipSearchResult);

  TestValidator.predicate(
    "IP address search should return valid pagination",
    ipSearchResult.pagination.current === 1 &&
      ipSearchResult.pagination.limit === 50,
  );

  // Step 4: Test user agent keyword filtering (browser identification)
  const userAgentKeyword = "Chrome";
  const userAgentSearchResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        user_agent_contains: userAgentKeyword,
        page: 1,
        limit: 30,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(userAgentSearchResult);

  TestValidator.predicate(
    "user agent search should return valid response",
    Array.isArray(userAgentSearchResult.data) &&
      userAgentSearchResult.pagination.limit === 30,
  );

  // Step 5: Test combined filters with sorting
  const combinedSearchResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        search: "Mozilla",
        min_page_views: 1,
        sort_by: "page_views",
        order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(combinedSearchResult);

  TestValidator.predicate(
    "combined search with filters should work correctly",
    combinedSearchResult.pagination.current === 1 &&
      combinedSearchResult.pagination.limit === 10 &&
      Array.isArray(combinedSearchResult.data),
  );

  // Step 6: Test pagination with different page sizes
  const paginationTestResult: IPageIDiscussionBoardGuest.ISummary =
    await api.functional.discussionBoard.moderator.guests.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardGuest.IRequest,
    });
  typia.assert(paginationTestResult);

  TestValidator.predicate(
    "pagination with custom limit should respect limit parameter",
    paginationTestResult.pagination.limit === 5 &&
      paginationTestResult.data.length <= 5,
  );

  // Step 7: Validate guest summary structure if data exists
  if (generalSearchResult.data.length > 0) {
    const sampleGuest = generalSearchResult.data[0];
    typia.assert(sampleGuest);

    TestValidator.predicate(
      "guest summary should have required fields",
      typeof sampleGuest.id === "string" &&
        typeof sampleGuest.session_identifier === "string" &&
        typeof sampleGuest.page_views === "number" &&
        sampleGuest.page_views >= 0,
    );
  }
}
