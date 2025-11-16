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
 * Test image retrieval endpoint's filtering capabilities by filename search.
 *
 * This test validates that the image filtering API correctly handles
 * filename-based search queries with partial matching. Since no image upload
 * endpoint is available, this test demonstrates the filtering API's behavior
 * and validates the response structure.
 *
 * Workflow:
 *
 * 1. Member joins and authenticates
 * 2. Member creates an article
 * 3. Test image filtering with various filename search patterns
 * 4. Validate pagination and response structure
 * 5. Test empty search behavior
 *
 * Note: Without an image upload endpoint, this test validates the API's
 * behavior rather than end-to-end image upload and retrieval flow.
 */
export async function test_api_article_images_filtering_by_filename(
  connection: api.IConnection,
) {
  // Step 1: Member joins and authenticates
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Member creates an article
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

  // Step 3: Test filtering with filename search - "chart"
  const searchChartRequest = {
    search: "chart",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const chartResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: searchChartRequest,
    });
  typia.assert(chartResults);

  // Validate pagination structure
  TestValidator.predicate(
    "chart search results have valid pagination",
    chartResults.pagination.current >= 0 &&
      chartResults.pagination.limit > 0 &&
      chartResults.pagination.records >= 0 &&
      chartResults.pagination.pages >= 0,
  );

  // Step 4: Test filtering with filename search - "graph"
  const searchGraphRequest = {
    search: "graph",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const graphResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: searchGraphRequest,
    });
  typia.assert(graphResults);

  // Validate pagination structure
  TestValidator.predicate(
    "graph search results have valid pagination",
    graphResults.pagination.current >= 0 &&
      graphResults.pagination.limit > 0 &&
      graphResults.pagination.records >= 0 &&
      graphResults.pagination.pages >= 0,
  );

  // Step 5: Test with original_filename filter
  const filenameFilterRequest = {
    original_filename: "diagram",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const filenameResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: filenameFilterRequest,
    });
  typia.assert(filenameResults);

  // Step 6: Test empty search - should return all images
  const emptySearchRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const allImages = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: emptySearchRequest,
    },
  );
  typia.assert(allImages);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page matches request",
    allImages.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    allImages.pagination.limit,
    10,
  );

  // Step 7: Test pagination with different page size
  const paginationRequest = {
    page: 1,
    limit: 5,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const paginatedResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: paginationRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.equals(
    "pagination limit updated correctly",
    paginatedResults.pagination.limit,
    5,
  );

  // Validate response data structure
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(paginatedResults.data),
  );
}
