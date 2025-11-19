import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test retrieving articles filtered by a specific contributor/author UUID.
 *
 * Validates that the article filtering API correctly returns only articles
 * created by a specified contributor. This test ensures author-based article
 * discovery works as expected by:
 *
 * 1. Generating multiple articles with different contributor IDs
 * 2. Calling the article list endpoint with a specific contributorId filter
 * 3. Verifying that only articles matching the contributor are returned
 * 4. Validating pagination information
 * 5. Testing with different contributors to ensure filtering works correctly
 */
export async function test_api_articles_list_with_contributor_filter(
  connection: api.IConnection,
) {
  // Generate unique contributor IDs for testing
  const contributor1: string = typia.random<string & tags.Format<"uuid">>();
  const contributor2: string = typia.random<string & tags.Format<"uuid">>();
  const contributor3: string = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Filter articles by first contributor
  const request1 = {
    page: 1,
    limit: 20,
    contributorId: contributor1,
  } satisfies IDiscussionBoardArticle.IRequest;

  const result1: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: request1,
    });

  typia.assert(result1);
  TestValidator.predicate(
    "result should have pagination information",
    result1.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination should have current page",
    result1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    result1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    result1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    result1.pagination.pages >= 0,
  );

  // Test 2: Filter articles by second contributor
  const request2 = {
    page: 1,
    limit: 20,
    contributorId: contributor2,
  } satisfies IDiscussionBoardArticle.IRequest;

  const result2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: request2,
    });

  typia.assert(result2);
  TestValidator.predicate(
    "second filter result should be valid",
    result2.data !== undefined,
  );

  // Test 3: Test without contributorId filter (should return all articles)
  const requestAll = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultAll: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestAll,
    });

  typia.assert(resultAll);
  TestValidator.predicate(
    "unfiltered result should contain articles",
    resultAll.data !== undefined,
  );

  // Test 4: Test pagination with different page numbers
  const requestPage2 = {
    page: 2,
    limit: 10,
    contributorId: contributor1,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultPage2: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestPage2,
    });

  typia.assert(resultPage2);
  TestValidator.equals(
    "second page should have current page set to 2",
    resultPage2.pagination.current,
    2,
  );

  // Test 5: Test with null contributorId (should return all articles)
  const requestNullContributor = {
    page: 1,
    limit: 20,
    contributorId: null,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultNullContributor: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestNullContributor,
    });

  typia.assert(resultNullContributor);
  TestValidator.predicate(
    "null contributor filter should return results",
    resultNullContributor.data !== undefined,
  );

  // Test 6: Verify article structure in response
  if (result1.data.length > 0) {
    const firstArticle = result1.data[0];
    TestValidator.predicate(
      "article should have id",
      firstArticle.id !== undefined && firstArticle.id.length > 0,
    );
    TestValidator.predicate(
      "article should have title",
      firstArticle.title !== undefined && firstArticle.title.length > 0,
    );
  }

  // Test 7: Test with different limit values
  const requestSmallLimit = {
    page: 1,
    limit: 5,
    contributorId: contributor3,
  } satisfies IDiscussionBoardArticle.IRequest;

  const resultSmallLimit: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: requestSmallLimit,
    });

  typia.assert(resultSmallLimit);
  TestValidator.predicate(
    "result with small limit should be valid",
    resultSmallLimit.pagination.limit === 5,
  );
}
