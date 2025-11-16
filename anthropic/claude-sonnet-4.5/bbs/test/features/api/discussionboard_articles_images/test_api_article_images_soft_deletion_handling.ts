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
 * Test the image retrieval endpoint's handling of the include_deleted
 * parameter.
 *
 * This test validates that the article images index endpoint correctly accepts
 * and processes the include_deleted parameter for filtering soft-deleted
 * images.
 *
 * Note: Due to API limitations (no upload/delete endpoints available), this
 * test validates parameter acceptance and response structure rather than actual
 * soft-deletion filtering behavior.
 *
 * Workflow:
 *
 * 1. A member joins and authenticates
 * 2. The member creates an article
 * 3. Retrieve images with include_deleted = false
 * 4. Retrieve images with include_deleted = true
 * 5. Retrieve images with include_deleted omitted (default behavior)
 *
 * Validation points:
 *
 * - Verify the endpoint accepts include_deleted parameter
 * - Verify all requests return valid paginated responses
 * - Verify response structure matches expected DTO
 * - Verify pagination metadata is consistent
 */
export async function test_api_article_images_soft_deletion_handling(
  connection: api.IConnection,
) {
  // Step 1: Member joins and authenticates
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article to hold images
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
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

  // Step 3: Retrieve images with include_deleted = false (explicit exclusion)
  const excludeDeletedRequest = {
    page: 1,
    limit: 10,
    include_deleted: false,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const excludeDeletedImages =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: excludeDeletedRequest,
    });
  typia.assert(excludeDeletedImages);

  // Step 4: Retrieve images with include_deleted = true (explicit inclusion)
  const includeDeletedRequest = {
    page: 1,
    limit: 10,
    include_deleted: true,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const includeDeletedImages =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: includeDeletedRequest,
    });
  typia.assert(includeDeletedImages);

  // Step 5: Retrieve images without specifying include_deleted (default behavior)
  const defaultRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const defaultImages =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: defaultRequest,
    });
  typia.assert(defaultImages);

  // Validation 1: Verify all responses have valid pagination structure
  TestValidator.predicate(
    "exclude_deleted response has valid pagination",
    excludeDeletedImages.pagination.current >= 0 &&
      excludeDeletedImages.pagination.limit > 0 &&
      excludeDeletedImages.pagination.records >= 0 &&
      excludeDeletedImages.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "include_deleted response has valid pagination",
    includeDeletedImages.pagination.current >= 0 &&
      includeDeletedImages.pagination.limit > 0 &&
      includeDeletedImages.pagination.records >= 0 &&
      includeDeletedImages.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "default response has valid pagination",
    defaultImages.pagination.current >= 0 &&
      defaultImages.pagination.limit > 0 &&
      defaultImages.pagination.records >= 0 &&
      defaultImages.pagination.pages >= 0,
  );

  // Validation 2: Verify all responses have valid data arrays
  TestValidator.predicate(
    "exclude_deleted response has valid data array",
    Array.isArray(excludeDeletedImages.data),
  );

  TestValidator.predicate(
    "include_deleted response has valid data array",
    Array.isArray(includeDeletedImages.data),
  );

  TestValidator.predicate(
    "default response has valid data array",
    Array.isArray(defaultImages.data),
  );

  // Validation 3: Verify pagination limit matches request
  TestValidator.equals(
    "exclude_deleted pagination limit matches request",
    excludeDeletedImages.pagination.limit,
    10,
  );

  TestValidator.equals(
    "include_deleted pagination limit matches request",
    includeDeletedImages.pagination.limit,
    10,
  );

  TestValidator.equals(
    "default pagination limit matches request",
    defaultImages.pagination.limit,
    10,
  );

  // Validation 4: Verify current page matches request
  TestValidator.equals(
    "exclude_deleted current page is 1",
    excludeDeletedImages.pagination.current,
    1,
  );

  TestValidator.equals(
    "include_deleted current page is 1",
    includeDeletedImages.pagination.current,
    1,
  );

  TestValidator.equals(
    "default current page is 1",
    defaultImages.pagination.current,
    1,
  );
}
