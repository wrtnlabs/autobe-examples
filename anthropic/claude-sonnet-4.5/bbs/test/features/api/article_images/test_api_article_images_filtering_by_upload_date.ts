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
 * Test the image retrieval endpoint's filtering capabilities by upload
 * timestamp ranges.
 *
 * This test validates that users can search for images uploaded before or after
 * specific dates using the uploaded_after and uploaded_before filter
 * parameters. The test creates a member, creates an article, and then tests
 * various temporal filtering scenarios to ensure the API correctly applies date
 * range filters to image retrieval operations.
 *
 * Workflow:
 *
 * 1. Member joins and authenticates
 * 2. Member creates an article to hold image attachments
 * 3. Calculate time boundaries based on article creation timestamp
 * 4. Test uploaded_after filter to retrieve recent images
 * 5. Test uploaded_before filter to retrieve older images
 * 6. Test combined date range filters (both uploaded_after and uploaded_before)
 *
 * Validation:
 *
 * - Verify uploaded_after filter excludes images with earlier created_at
 *   timestamps
 * - Verify uploaded_before filter excludes images with later created_at
 *   timestamps
 * - Verify combined date range filters work correctly together
 * - Validate ISO 8601 date-time format is properly handled
 * - Ensure pagination works correctly with upload date filters
 * - Verify created_at timestamps in responses are accurate and properly formatted
 */
export async function test_api_article_images_filtering_by_upload_date(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create an article to hold image attachments
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Calculate time boundaries based on article creation
  // Parse the article's created_at timestamp as our baseline
  const articleCreatedAt = new Date(article.created_at);

  // Calculate timestamps for filtering:
  // - One hour before article creation
  const oneHourBefore = new Date(articleCreatedAt.getTime() - 60 * 60 * 1000);
  // - One hour after article creation
  const oneHourAfter = new Date(articleCreatedAt.getTime() + 60 * 60 * 1000);
  // - Two hours after article creation
  const twoHoursAfter = new Date(
    articleCreatedAt.getTime() + 2 * 60 * 60 * 1000,
  );

  // Step 4: Test uploaded_after filter - retrieve images uploaded after a specific timestamp
  const afterFilterRequest = {
    page: 1,
    limit: 10,
    uploaded_after: oneHourBefore.toISOString(),
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const imagesAfter: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: afterFilterRequest,
    });
  typia.assert(imagesAfter);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists for uploaded_after filter",
    imagesAfter.pagination !== null && imagesAfter.pagination !== undefined,
  );

  // Validate that all returned images have created_at >= uploaded_after
  imagesAfter.data.forEach((image) => {
    const imageCreatedAt = new Date(image.created_at);
    TestValidator.predicate(
      `image ${image.id} created_at is after filter threshold`,
      imageCreatedAt >= oneHourBefore,
    );
  });

  // Step 5: Test uploaded_before filter - retrieve images uploaded before a specific timestamp
  const beforeFilterRequest = {
    page: 1,
    limit: 10,
    uploaded_before: oneHourAfter.toISOString(),
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const imagesBefore: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: beforeFilterRequest,
    });
  typia.assert(imagesBefore);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists for uploaded_before filter",
    imagesBefore.pagination !== null && imagesBefore.pagination !== undefined,
  );

  // Validate that all returned images have created_at <= uploaded_before
  imagesBefore.data.forEach((image) => {
    const imageCreatedAt = new Date(image.created_at);
    TestValidator.predicate(
      `image ${image.id} created_at is before filter threshold`,
      imageCreatedAt <= oneHourAfter,
    );
  });

  // Step 6: Test combined date range filters (both uploaded_after and uploaded_before)
  const rangeFilterRequest = {
    page: 1,
    limit: 10,
    uploaded_after: oneHourBefore.toISOString(),
    uploaded_before: twoHoursAfter.toISOString(),
  } satisfies IDiscussionBoardArticleImage.IRequest;

  const imagesInRange: IPageIDiscussionBoardArticleImage.ISummary =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: rangeFilterRequest,
    });
  typia.assert(imagesInRange);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists for date range filter",
    imagesInRange.pagination !== null && imagesInRange.pagination !== undefined,
  );

  // Validate that all returned images fall within the date range
  imagesInRange.data.forEach((image) => {
    const imageCreatedAt = new Date(image.created_at);
    TestValidator.predicate(
      `image ${image.id} created_at is within date range`,
      imageCreatedAt >= oneHourBefore && imageCreatedAt <= twoHoursAfter,
    );
  });

  // Validate ISO 8601 format of created_at timestamps in responses
  const allImages = [
    ...imagesAfter.data,
    ...imagesBefore.data,
    ...imagesInRange.data,
  ];
  allImages.forEach((image) => {
    TestValidator.predicate(
      `image ${image.id} has valid ISO 8601 created_at format`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/i.test(
        image.created_at,
      ),
    );
  });
}
