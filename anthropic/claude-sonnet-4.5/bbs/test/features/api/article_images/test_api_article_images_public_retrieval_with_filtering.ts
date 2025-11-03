import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";

/**
 * Test public retrieval and filtering of article image attachments without
 * authentication.
 *
 * This test validates that guest users can retrieve and filter article images
 * through the public API endpoint. It ensures that filtering works correctly
 * for various image properties including MIME type, dimensions, file size, and
 * upload date. The test also verifies pagination functionality and metadata
 * completeness.
 *
 * Workflow:
 *
 * 1. Create a member account for article authorship
 * 2. Create a moderator account for category creation
 * 3. Create a category (required for article creation)
 * 4. Create an article as the authenticated member
 * 5. Upload multiple images with different properties (varying MIME types,
 *    dimensions, sizes)
 * 6. Create an unauthenticated connection to simulate guest access
 * 7. Retrieve images with various filters (MIME type, size ranges, dimensions)
 * 8. Validate filtering results match expected criteria
 * 9. Test pagination with different page sizes
 * 10. Verify response metadata is complete and accurate
 */
export async function test_api_article_images_public_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to member authentication to create article
  connection.headers = connection.headers ?? {};
  connection.headers.Authorization = member.token.access;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload multiple images with different properties
  const mimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;
  const uploadedImages: IDiscussionBoardArticleImage[] = [];

  for (let i = 0; i < 8; i++) {
    const width = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >();
    const height = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >();
    const sizeBytes = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
    >();
    const mimeType = RandomGenerator.pick(mimeTypes);

    const image =
      await api.functional.discussionBoard.member.articles.images.create(
        connection,
        {
          articleId: article.id,
          body: {
            url: typia.random<string & tags.Format<"uri">>(),
            original_name: `test_image_${i}.${mimeType.split("/")[1]}`,
            mime_type: mimeType,
            size_bytes: sizeBytes,
            width: width,
            height: height,
          } satisfies IDiscussionBoardArticleImage.ICreate,
        },
      );
    typia.assert(image);
    uploadedImages.push(image);
  }

  // Step 6: Create unauthenticated connection for guest access
  const guestConnection: api.IConnection = { ...connection, headers: {} };

  // Step 7 & 8: Test filtering by MIME type
  const jpegFilter = await api.functional.discussionBoard.articles.images.index(
    guestConnection,
    {
      articleId: article.id,
      body: {
        mime_type: "image/jpeg",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(jpegFilter);

  const expectedJpegImages = uploadedImages.filter(
    (img) => img.mime_type === "image/jpeg",
  );
  TestValidator.equals(
    "MIME type filtering returns only JPEG images",
    jpegFilter.data.length,
    expectedJpegImages.length,
  );

  // Test filtering by size range
  const minSize = 100000;
  const maxSize = 3000000;
  const sizeRangeFilter =
    await api.functional.discussionBoard.articles.images.index(
      guestConnection,
      {
        articleId: article.id,
        body: {
          min_size_bytes: minSize,
          max_size_bytes: maxSize,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleImage.IRequest,
      },
    );
  typia.assert(sizeRangeFilter);

  const expectedSizeImages = uploadedImages.filter(
    (img) => img.size_bytes >= minSize && img.size_bytes <= maxSize,
  );
  TestValidator.equals(
    "size range filtering returns correct images",
    sizeRangeFilter.data.length,
    expectedSizeImages.length,
  );

  // Test filtering by dimensions
  const minWidth = 200;
  const maxHeight = 5000;
  const dimensionFilter =
    await api.functional.discussionBoard.articles.images.index(
      guestConnection,
      {
        articleId: article.id,
        body: {
          min_width: minWidth,
          max_height: maxHeight,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleImage.IRequest,
      },
    );
  typia.assert(dimensionFilter);

  const expectedDimensionImages = uploadedImages.filter(
    (img) => img.width >= minWidth && img.height <= maxHeight,
  );
  TestValidator.equals(
    "dimension filtering returns correct images",
    dimensionFilter.data.length,
    expectedDimensionImages.length,
  );

  // Step 9: Test pagination
  const page1 = await api.functional.discussionBoard.articles.images.index(
    guestConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.predicate(
    "first page contains correct number of items",
    page1.data.length <= 3,
  );
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );

  const page2 = await api.functional.discussionBoard.articles.images.index(
    guestConnection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 3,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.equals(
    "pagination current page is 2",
    page2.pagination.current,
    2,
  );

  // Step 10: Verify response metadata completeness
  const allImages = await api.functional.discussionBoard.articles.images.index(
    guestConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(allImages);

  TestValidator.predicate(
    "all images have complete metadata",
    allImages.data.every(
      (img) =>
        img.id !== undefined &&
        img.url !== undefined &&
        img.original_name !== undefined &&
        img.mime_type !== undefined &&
        img.size_bytes !== undefined &&
        img.width !== undefined &&
        img.height !== undefined &&
        img.created_at !== undefined,
    ),
  );

  // Verify soft-deleted images are excluded
  TestValidator.predicate(
    "soft-deleted images are excluded from results",
    allImages.data.every(
      (img) => img.deleted_at === null || img.deleted_at === undefined,
    ),
  );

  TestValidator.equals(
    "total records match uploaded images count",
    allImages.pagination.records,
    uploadedImages.length,
  );
}
