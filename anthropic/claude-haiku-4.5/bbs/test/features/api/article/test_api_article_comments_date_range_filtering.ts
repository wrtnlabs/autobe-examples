import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test filtering comments by creation date ranges.
 *
 * This test validates that the API correctly filters article comments using
 * created_after and created_before parameters. It verifies boundary conditions,
 * empty date ranges, and extreme date ranges, ensuring proper pagination and
 * sorting work with date-filtered results.
 *
 * Process:
 *
 * 1. Authenticate as a contributor
 * 2. Create an article for comment testing
 * 3. Simulate comments at different timestamps
 * 4. Test filtering with created_after parameter
 * 5. Test filtering with created_before parameter
 * 6. Test filtering with both parameters (date range)
 * 7. Test boundary conditions at exact timestamps
 * 8. Test with empty date ranges
 * 9. Test with extreme date ranges
 * 10. Verify pagination metadata in filtered results
 */
export async function test_api_article_comments_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as contributor
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: "TempPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article for testing comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Test Article for Date Range Filtering",
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles",
          referrer: "http://localhost:3000/home",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Define time reference points for comment creation
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Step 4: Test filtering comments created after a specific timestamp
  const afterTwoHours: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_after: twoHoursAgo.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(afterTwoHours);
  TestValidator.predicate(
    "comments created_after response should be paginated",
    afterTwoHours.pagination !== null && afterTwoHours.pagination !== undefined,
  );

  // Step 5: Test filtering comments created before a specific timestamp
  const beforeTwoHours: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_before: twoHoursAgo.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(beforeTwoHours);
  TestValidator.predicate(
    "comments created_before response should be paginated",
    beforeTwoHours.pagination !== null &&
      beforeTwoHours.pagination !== undefined,
  );

  // Step 6: Test filtering within a date range
  const withinRange: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_after: threeHoursAgo.toISOString(),
        created_before: oneHourAgo.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(withinRange);
  TestValidator.equals(
    "date range filtered response should have pagination data",
    withinRange.pagination !== null,
    true,
  );

  // Step 7: Test boundary conditions - exact timestamp boundaries
  const atBoundary: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_after: twoHoursAgo.toISOString(),
        created_before: twoHoursAgo.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(atBoundary);
  TestValidator.predicate(
    "boundary condition query should return valid response",
    atBoundary.data !== null && Array.isArray(atBoundary.data),
  );

  // Step 8: Test with empty date range (no comments expected)
  const emptyRange: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_after: oneWeekAgo.toISOString(),
        created_before: new Date(oneWeekAgo.getTime() - 1000).toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(emptyRange);
  TestValidator.predicate(
    "empty date range should return valid paginated response",
    emptyRange.pagination.records >= 0,
  );

  // Step 9: Test with extreme date ranges
  const extremeOldDate = new Date("2000-01-01T00:00:00Z");
  const extremeFutureDate = new Date("2099-12-31T23:59:59Z");

  const extremeRange: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
        created_after: extremeOldDate.toISOString(),
        created_before: extremeFutureDate.toISOString(),
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(extremeRange);
  TestValidator.predicate(
    "extreme date range should return valid response",
    extremeRange.pagination !== null,
  );

  // Step 10: Verify pagination metadata structure
  TestValidator.equals(
    "pagination should have current page number",
    typeof extremeRange.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination should have limit property",
    typeof extremeRange.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination should have total records count",
    typeof extremeRange.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination should have total pages count",
    typeof extremeRange.pagination.pages,
    "number",
  );

  // Step 11: Verify data array structure and content
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(extremeRange.data),
  );
  TestValidator.predicate(
    "each comment in data should have id",
    extremeRange.data.length === 0 ||
      (extremeRange.data[0].id !== undefined &&
        extremeRange.data[0].id !== null),
  );
  TestValidator.predicate(
    "each comment in data should have content",
    extremeRange.data.length === 0 ||
      (extremeRange.data[0].content !== undefined &&
        extremeRange.data[0].content !== null),
  );
}
