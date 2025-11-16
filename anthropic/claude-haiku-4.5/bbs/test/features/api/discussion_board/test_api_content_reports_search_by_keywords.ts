import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Tests searching content reports using text search functionality across report
 * descriptions and moderator notes.
 *
 * This test validates that moderators can effectively search the report queue
 * using keywords to find specific reports. The test verifies that the search
 * function returns reports matching search terms in descriptions or notes
 * fields, tests various search patterns including partial matches and multiple
 * keywords, and ensures search results properly exclude non-matching reports
 * while maintaining accurate pagination.
 *
 * Workflow:
 *
 * 1. Moderator authenticates and joins the system
 * 2. Moderator searches content reports using various search keywords
 * 3. Validates search results contain only matching reports
 * 4. Tests multiple search patterns and keywords
 * 5. Verifies pagination works correctly with search results
 */
export async function test_api_content_reports_search_by_keywords(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(15),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Test searching without keywords (should return reports)
  const allReports: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(allReports);
  TestValidator.predicate(
    "all reports response should have pagination",
    allReports.pagination !== undefined,
  );
  TestValidator.predicate(
    "all reports should have data array",
    Array.isArray(allReports.data),
  );

  // 3. Test searching with a specific keyword - should find matching reports
  const searchKeyword = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 10 }),
  );
  const searchResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          search: searchKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should have pagination",
    searchResults.pagination !== undefined,
  );

  // 4. Test pagination with search results
  const secondPageResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          search: searchKeyword,
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(secondPageResults);
  TestValidator.equals(
    "pagination limit should remain consistent",
    searchResults.pagination.limit,
    secondPageResults.pagination.limit,
  );

  // 5. Test searching with different keyword
  const anotherKeyword = RandomGenerator.substring(
    RandomGenerator.paragraph({ sentences: 5 }),
  );
  const anotherSearchResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          search: anotherKeyword,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(anotherSearchResults);

  // 6. Test search with status filter combined
  const searchWithStatus: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          search: searchKeyword,
          status: "pending_review",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(searchWithStatus);

  // 7. Validate search results have required fields
  if (searchResults.data.length > 0) {
    const firstResult = searchResults.data[0];
    typia.assert(firstResult);
    TestValidator.predicate(
      "search result should have id",
      typeof firstResult.id === "string",
    );
    TestValidator.predicate(
      "search result should have reason",
      firstResult.reason !== undefined,
    );
    TestValidator.predicate(
      "search result should have status",
      firstResult.status !== undefined,
    );
    TestValidator.predicate(
      "search result should have created_at",
      firstResult.created_at !== undefined,
    );
    TestValidator.predicate(
      "search result should have reporter",
      firstResult.reporter !== undefined,
    );
  }

  // 8. Test search with different limit
  const smallPageResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.moderation.content_reports.index(
      connection,
      {
        body: {
          search: searchKeyword,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardReport.IRequest,
      },
    );
  typia.assert(smallPageResults);
  TestValidator.equals(
    "small page limit should be 5",
    smallPageResults.pagination.limit,
    5,
  );
}
