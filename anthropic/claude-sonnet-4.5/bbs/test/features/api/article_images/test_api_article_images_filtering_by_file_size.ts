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
 * Test filtering of discussion board article images by file size constraints.
 *
 * This test validates that the image retrieval endpoint correctly filters
 * images based on minimum and maximum file size parameters. It ensures users
 * can search for images within specific file size ranges to meet bandwidth,
 * storage, or performance requirements.
 *
 * Workflow:
 *
 * 1. Register and authenticate a member
 * 2. Create a discussion board article
 * 3. Test filtering by minimum file size (exclude small thumbnails)
 * 4. Test filtering by maximum file size (find only small/medium files)
 * 5. Test filtering with combined min and max file size range
 * 6. Validate pagination works with file size filters
 *
 * Validation:
 *
 * - Verify min_file_size filter excludes images smaller than specified bytes
 * - Verify max_file_size filter excludes images larger than specified bytes
 * - Verify combined file size range filters work correctly
 * - Ensure file_size values in responses are accurate
 */
export async function test_api_article_images_filtering_by_file_size(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a discussion board article to hold image attachments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Test filtering by minimum file size (exclude small thumbnails)
  const minFileSize = 100000; // 100KB minimum
  const minFilterRequest = {
    page: 1,
    limit: 10,
    min_file_size: minFileSize,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const minFilteredImages: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: minFilterRequest,
    });
  typia.assert(minFilteredImages);

  // Validate all returned images meet minimum file size requirement
  for (const image of minFilteredImages.data) {
    TestValidator.predicate(
      "image file size should be >= min_file_size",
      image.file_size >= minFileSize,
    );
  }

  // Step 4: Test filtering by maximum file size (find only small/medium files)
  const maxFileSize = 500000; // 500KB maximum
  const maxFilterRequest = {
    page: 1,
    limit: 10,
    max_file_size: maxFileSize,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const maxFilteredImages: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: maxFilterRequest,
    });
  typia.assert(maxFilteredImages);

  // Validate all returned images meet maximum file size requirement
  for (const image of maxFilteredImages.data) {
    TestValidator.predicate(
      "image file size should be <= max_file_size",
      image.file_size <= maxFileSize,
    );
  }

  // Step 5: Test filtering with combined min and max file size range
  const rangeMinSize = 50000; // 50KB minimum
  const rangeMaxSize = 1000000; // 1MB maximum
  const rangeFilterRequest = {
    page: 1,
    limit: 10,
    min_file_size: rangeMinSize,
    max_file_size: rangeMaxSize,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const rangeFilteredImages: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: rangeFilterRequest,
    });
  typia.assert(rangeFilteredImages);

  // Validate all returned images are within the specified range
  for (const image of rangeFilteredImages.data) {
    TestValidator.predicate(
      "image file size should be >= min and <= max",
      image.file_size >= rangeMinSize && image.file_size <= rangeMaxSize,
    );
  }

  // Step 6: Validate pagination works with file size filters
  const paginationRequest = {
    page: 1,
    limit: 5,
    min_file_size: 10000,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const paginatedImages: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: paginationRequest,
    });
  typia.assert(paginatedImages);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    paginatedImages.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 5",
    paginatedImages.pagination.limit === 5,
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    paginatedImages.data.length <= 5,
  );

  // Validate each image in paginated results meets file size filter
  for (const image of paginatedImages.data) {
    TestValidator.predicate(
      "paginated image file size should meet min requirement",
      image.file_size >= 10000,
    );
  }
}
