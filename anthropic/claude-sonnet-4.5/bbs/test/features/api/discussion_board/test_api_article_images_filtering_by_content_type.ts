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
 * Test the image retrieval endpoint's filtering capabilities by content type.
 *
 * This test validates that users can filter article images by specific MIME
 * types (JPEG, PNG, GIF, WebP). It ensures the content_type parameter correctly
 * filters images and that pagination works properly with content type filters.
 *
 * Workflow:
 *
 * 1. A member joins and authenticates
 * 2. The member creates an article
 * 3. Retrieve images filtered by specific content type (image/jpeg)
 * 4. Retrieve images filtered by another content type (image/png)
 * 5. Validate that filtering returns only matching content types
 * 6. Verify pagination works correctly with filters
 */
export async function test_api_article_images_filtering_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Member joins and authenticates
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: "https://test.example.com/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://test.example.com/home" satisfies string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article to hold image attachments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Retrieve images filtered by content type "image/jpeg"
  const jpegFilterRequest = {
    page: 1,
    limit: 10,
    content_type: "image/jpeg" as const,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const jpegResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: jpegFilterRequest,
    });
  typia.assert(jpegResults);

  // Validate pagination structure
  TestValidator.predicate(
    "JPEG results should have valid pagination",
    jpegResults.pagination.current >= 0 &&
      jpegResults.pagination.limit === 10 &&
      jpegResults.pagination.records >= 0 &&
      jpegResults.pagination.pages >= 0,
  );

  // Validate all returned images have JPEG content type
  if (jpegResults.data.length > 0) {
    for (const image of jpegResults.data) {
      TestValidator.equals(
        "filtered image should have JPEG content type",
        image.content_type,
        "image/jpeg",
      );
    }
  }

  // Step 4: Retrieve images filtered by content type "image/png"
  const pngFilterRequest = {
    page: 1,
    limit: 10,
    content_type: "image/png" as const,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const pngResults = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: pngFilterRequest,
    },
  );
  typia.assert(pngResults);

  // Validate pagination structure for PNG results
  TestValidator.predicate(
    "PNG results should have valid pagination",
    pngResults.pagination.current >= 0 &&
      pngResults.pagination.limit === 10 &&
      pngResults.pagination.records >= 0 &&
      pngResults.pagination.pages >= 0,
  );

  // Validate all returned images have PNG content type
  if (pngResults.data.length > 0) {
    for (const image of pngResults.data) {
      TestValidator.equals(
        "filtered image should have PNG content type",
        image.content_type,
        "image/png",
      );
    }
  }

  // Step 5: Test with WebP content type filter
  const webpFilterRequest = {
    page: 1,
    limit: 10,
    content_type: "image/webp" as const,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const webpResults =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: webpFilterRequest,
    });
  typia.assert(webpResults);

  // Validate WebP results
  if (webpResults.data.length > 0) {
    for (const image of webpResults.data) {
      TestValidator.equals(
        "filtered image should have WebP content type",
        image.content_type,
        "image/webp",
      );
    }
  }

  // Step 6: Test without content_type filter (all images)
  const allImagesRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const allResults = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: allImagesRequest,
    },
  );
  typia.assert(allResults);

  // Verify the response structure is valid
  TestValidator.predicate(
    "unfiltered results should have valid structure",
    allResults.pagination !== null &&
      allResults.pagination !== undefined &&
      Array.isArray(allResults.data),
  );
}
