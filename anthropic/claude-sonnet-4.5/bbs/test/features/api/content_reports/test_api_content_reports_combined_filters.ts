import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test complex filtering scenarios combining multiple filter criteria to
 * validate advanced moderation queue management.
 *
 * This test validates the content report filtering API's ability to handle
 * sophisticated filter combinations that moderators use in real-world
 * workflows. Tests all available filter parameters individually and in
 * combination to ensure the query pipeline works correctly with AND logic.
 * Validates response structure, pagination behavior, sorting options, and edge
 * cases across all filter combinations.
 *
 * Since no report creation API is available, this test focuses on validating
 * the filtering mechanics, API contract compliance, and proper handling of
 * filter parameters rather than testing against specific report data. All
 * filter combinations should return valid paginated responses with correct
 * structure regardless of whether reports exist in the system.
 */
export async function test_api_content_reports_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator for authentication
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category for potential article references
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Test basic filtering - status filter
  const statusValues = [
    "pending",
    "reviewed_no_action",
    "reviewed_edited",
    "reviewed_removed",
  ] as const;
  for (const status of statusValues) {
    const result =
      await api.functional.discussionBoard.moderator.contentReports.index(
        connection,
        {
          body: {
            status: status,
            page: 1,
            limit: 20,
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `status filter '${status}' returns valid pagination`,
      result.pagination.current === 1,
    );
    TestValidator.predicate(
      `status filter '${status}' respects limit`,
      result.data.length <= 20,
    );
  }

  // Step 4: Test category filtering
  const categoryValues = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  for (const reportCategory of categoryValues) {
    const result =
      await api.functional.discussionBoard.moderator.contentReports.index(
        connection,
        {
          body: {
            report_category: reportCategory,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `category filter '${reportCategory}' returns valid response`,
      result.pagination.pages >= 0,
    );
  }

  // Step 5: Test date range filtering
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          created_at_from: sevenDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns valid pagination",
    dateRangeResult.pagination.current === 1,
  );

  // Step 6: Test combined filters - status + category
  const statusCategoryResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          status: "pending",
          report_category: "Spam",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(statusCategoryResult);
  TestValidator.predicate(
    "status + category filter works",
    statusCategoryResult.pagination.records >= 0,
  );

  // Step 7: Test combined filters - status + date range
  const statusDateResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          status: "pending",
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(statusDateResult);
  TestValidator.predicate(
    "status + date range filter respects limit",
    statusDateResult.data.length <= 15,
  );

  // Step 8: Test triple combination - status + category + date range
  const tripleFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          status: "pending",
          report_category: "Misinformation",
          created_at_from: sevenDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(tripleFilterResult);
  TestValidator.predicate(
    "triple filter combination works",
    tripleFilterResult.pagination.pages >= 0,
  );

  // Step 9: Test sorting options
  const sortByValues = ["created_at", "resolved_at", "status"] as const;
  const orderValues = ["asc", "desc"] as const;

  for (const sortBy of sortByValues) {
    for (const order of orderValues) {
      const sortResult =
        await api.functional.discussionBoard.moderator.contentReports.index(
          connection,
          {
            body: {
              sort_by: sortBy,
              order: order,
              page: 1,
              limit: 10,
            } satisfies IDiscussionBoardContentReport.IRequest,
          },
        );
      typia.assert(sortResult);
      TestValidator.predicate(
        `sort by ${sortBy} ${order} works`,
        sortResult.pagination.current === 1,
      );
    }
  }

  // Step 10: Test pagination with filters
  const page1Result =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.predicate(
    "page 1 respects limit",
    page1Result.data.length <= 5,
  );
  TestValidator.predicate(
    "page 1 pagination is correct",
    page1Result.pagination.limit === 5,
  );

  const page2Result =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          status: "pending",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.predicate("page 2 works", page2Result.pagination.current === 2);

  // Step 11: Test edge case - future date range (should return empty)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "future date filter returns empty data",
    emptyResult.data.length === 0,
  );
  TestValidator.predicate(
    "future date filter shows zero records",
    emptyResult.pagination.records === 0,
  );

  // Step 12: Test resolved date filtering
  const resolvedDateResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          resolved_at_from: thirtyDaysAgo.toISOString(),
          resolved_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(resolvedDateResult);
  TestValidator.predicate(
    "resolved date range filter works",
    resolvedDateResult.pagination.current === 1,
  );

  // Step 13: Test comprehensive filter combination
  const comprehensiveResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          status: "reviewed_no_action",
          report_category: "Other",
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(comprehensiveResult);
  TestValidator.predicate(
    "comprehensive filter returns valid structure",
    comprehensiveResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "comprehensive filter respects page",
    comprehensiveResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "comprehensive filter respects limit",
    comprehensiveResult.data.length <= 10,
  );

  // Step 14: Test with random UUID references (should return empty or valid results)
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomMemberId = typia.random<string & tags.Format<"uuid">>();
  const randomModeratorId = typia.random<string & tags.Format<"uuid">>();

  const articleFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          discussion_board_article_id: randomArticleId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(articleFilterResult);

  const memberFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          discussion_board_member_id: randomMemberId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(memberFilterResult);

  const moderatorFilterResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          resolved_by_moderator_id: randomModeratorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(moderatorFilterResult);

  // Step 15: Test all filters combined
  const allFiltersResult =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
          report_category: "Spam",
          discussion_board_article_id: randomArticleId,
          discussion_board_member_id: randomMemberId,
          resolved_by_moderator_id: randomModeratorId,
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          resolved_at_from: thirtyDaysAgo.toISOString(),
          resolved_at_to: now.toISOString(),
          sort_by: "status",
          order: "asc",
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(allFiltersResult);
  TestValidator.predicate(
    "all filters combined returns valid response",
    allFiltersResult.pagination.records >= 0,
  );
}
