import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";

/**
 * Test the image retrieval endpoint's filtering capabilities by image
 * dimensions.
 *
 * This test validates that the image filtering API correctly accepts
 * dimension-based filter parameters and returns properly structured paginated
 * responses. Since no image upload API is available, this test focuses on
 * validating the API contract, parameter handling, and response structure
 * rather than actual filter behavior on populated image data.
 *
 * Workflow:
 *
 * 1. Member joins and authenticates
 * 2. Member creates an article
 * 3. Test filtering API with minimum width parameter
 * 4. Test filtering API with maximum height parameter
 * 5. Test filtering API with combined width and height ranges
 * 6. Test filtering API with all dimension parameters
 * 7. Validate pagination works with dimension filters
 * 8. Validate response structure matches expected types
 */
export async function test_api_article_images_filtering_by_dimensions(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article to test image filtering endpoint
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Test filtering API accepts minimum width parameter
  const minWidthFilter = {
    min_width: 300,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const minWidthResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: minWidthFilter,
    });
  typia.assert(minWidthResults);

  // Validate response structure for min_width filter
  TestValidator.predicate(
    "min_width filter returns valid pagination",
    minWidthResults.pagination.current >= 0 &&
      minWidthResults.pagination.limit >= 0 &&
      minWidthResults.pagination.records >= 0 &&
      minWidthResults.pagination.pages >= 0,
  );

  // Step 4: Test filtering API accepts maximum height parameter
  const maxHeightFilter = {
    max_height: 600,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const maxHeightResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: maxHeightFilter,
    });
  typia.assert(maxHeightResults);

  // Validate response structure for max_height filter
  TestValidator.predicate(
    "max_height filter returns valid pagination",
    maxHeightResults.pagination.current >= 0 &&
      maxHeightResults.pagination.limit >= 0 &&
      maxHeightResults.pagination.records >= 0 &&
      maxHeightResults.pagination.pages >= 0,
  );

  // Step 5: Test combined dimension filters (width and height ranges)
  const combinedFilter = {
    min_width: 200,
    max_width: 800,
    min_height: 150,
    max_height: 700,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const combinedResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: combinedFilter,
    });
  typia.assert(combinedResults);

  // Validate response structure for combined filters
  TestValidator.predicate(
    "combined dimension filters return valid response",
    Array.isArray(combinedResults.data) &&
      combinedResults.pagination.current === 1 &&
      combinedResults.pagination.limit === 20,
  );

  // Step 6: Test all dimension parameters together
  const allDimensionsFilter = {
    min_width: 100,
    max_width: 1000,
    min_height: 100,
    max_height: 1000,
    page: 1,
    limit: 15,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const allDimensionsResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: allDimensionsFilter,
    });
  typia.assert(allDimensionsResults);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "all dimension filters pagination metadata is valid",
    allDimensionsResults.pagination.current === 1 &&
      allDimensionsResults.pagination.limit === 15 &&
      typeof allDimensionsResults.pagination.records === "number" &&
      typeof allDimensionsResults.pagination.pages === "number",
  );

  // Step 7: Test pagination with dimension filters
  const paginationFilter = {
    min_width: 100,
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const paginatedResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: paginationFilter,
    });
  typia.assert(paginatedResults);

  // Validate pagination parameters are respected
  TestValidator.predicate(
    "pagination current page reflects request",
    paginatedResults.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit reflects request",
    paginatedResults.pagination.limit === 5,
  );

  // Step 8: Test maximum width filter parameter
  const maxWidthFilter = {
    max_width: 500,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const maxWidthResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: maxWidthFilter,
    });
  typia.assert(maxWidthResults);

  // Validate response data array structure
  TestValidator.predicate(
    "max_width filter returns array data",
    Array.isArray(maxWidthResults.data),
  );

  // Step 9: Test minimum height filter parameter
  const minHeightFilter = {
    min_height: 250,
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const minHeightResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: minHeightFilter,
    });
  typia.assert(minHeightResults);

  // Validate response structure consistency
  TestValidator.predicate(
    "min_height filter response has required properties",
    "pagination" in minHeightResults &&
      "data" in minHeightResults &&
      Array.isArray(minHeightResults.data),
  );

  // Step 10: Test filtering with boundary dimension values
  const boundaryFilter = {
    min_width: 0,
    max_width: 10000,
    min_height: 0,
    max_height: 10000,
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const boundaryResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: boundaryFilter,
    });
  typia.assert(boundaryResults);

  // Validate API accepts boundary values
  TestValidator.predicate(
    "boundary dimension values are accepted",
    boundaryResults.pagination.limit === 50 &&
      boundaryResults.pagination.current === 1,
  );
}
