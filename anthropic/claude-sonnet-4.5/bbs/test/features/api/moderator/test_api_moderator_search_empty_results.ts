import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test moderator search behavior when no moderators match the specified
 * criteria.
 *
 * Validates that empty search results return proper pagination structure with
 * zero records, empty data array, and no errors. Tests multiple search
 * scenarios including non-existent usernames, emails, impossible date ranges,
 * and combined filters.
 *
 * Process:
 *
 * 1. Create and authenticate a moderator account
 * 2. Search with non-existent username pattern
 * 3. Search with non-existent email address
 * 4. Search with impossible future date range
 * 5. Search with combined impossible filters
 * 6. Verify all responses have valid empty pagination structure
 */
export async function test_api_moderator_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string>(),
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Search with guaranteed non-existent username
  const nonExistentUsername = `nonexistent_${RandomGenerator.alphaNumeric(20)}_${Date.now()}`;
  const usernameSearchResult: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: nonExistentUsername,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(usernameSearchResult);

  // Validate empty result structure for username search
  TestValidator.equals(
    "username search returns zero records",
    usernameSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "username search returns zero pages",
    usernameSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "username search current page is 1",
    usernameSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "username search limit is 10",
    usernameSearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "username search data array is empty",
    usernameSearchResult.data.length,
    0,
  );

  // Step 3: Search with non-existent email address
  const nonExistentEmail = `nonexistent${Date.now()}${RandomGenerator.alphaNumeric(15)}@invalid-domain-xyz-${RandomGenerator.alphaNumeric(10)}.com`;
  const emailSearchResult: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          email: nonExistentEmail,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(emailSearchResult);

  // Validate empty result structure for email search
  TestValidator.equals(
    "email search returns zero records",
    emailSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "email search returns zero pages",
    emailSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "email search current page is 1",
    emailSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "email search limit is 20",
    emailSearchResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "email search data array is empty",
    emailSearchResult.data.length,
    0,
  );

  // Step 4: Search with impossible future date range
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureDateString = futureDate.toISOString();

  const dateRangeSearchResult: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          created_at_from: futureDateString,
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(dateRangeSearchResult);

  // Validate empty result structure for date range search
  TestValidator.equals(
    "future date search returns zero records",
    dateRangeSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search returns zero pages",
    dateRangeSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date search current page is 1",
    dateRangeSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "future date search limit is 15",
    dateRangeSearchResult.pagination.limit,
    15,
  );
  TestValidator.equals(
    "future date search data array is empty",
    dateRangeSearchResult.data.length,
    0,
  );

  // Step 5: Search with combined impossible filters
  const impossiblePastDate = new Date("1900-01-01T00:00:00Z").toISOString();
  const veryEarlyPastDate = new Date("1900-12-31T23:59:59Z").toISOString();

  const combinedSearchResult: IPageIDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          search: `impossible_${RandomGenerator.alphaNumeric(25)}`,
          email: `never-exists-${Date.now()}@no-domain-${RandomGenerator.alphaNumeric(20)}.invalid`,
          created_at_from: impossiblePastDate,
          created_at_to: veryEarlyPastDate,
          is_active: false,
          page: 2,
          limit: 25,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(combinedSearchResult);

  // Validate empty result structure for combined search
  TestValidator.equals(
    "combined search returns zero records",
    combinedSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined search returns zero pages",
    combinedSearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined search current page is 2",
    combinedSearchResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined search limit is 25",
    combinedSearchResult.pagination.limit,
    25,
  );
  TestValidator.equals(
    "combined search data array is empty",
    combinedSearchResult.data.length,
    0,
  );

  // Step 6: Verify pagination structure consistency across all empty results
  TestValidator.predicate(
    "all empty searches maintain consistent pagination structure",
    usernameSearchResult.pagination.records === 0 &&
      emailSearchResult.pagination.records === 0 &&
      dateRangeSearchResult.pagination.records === 0 &&
      combinedSearchResult.pagination.records === 0,
  );
}
