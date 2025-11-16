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
 * Test the image retrieval endpoint's sorting and pagination capabilities.
 *
 * This test validates that users can sort article images by different fields
 * and navigate through paginated results with proper ordering consistency.
 *
 * Note: This test works with potentially empty image collections since no image
 * upload endpoint is available in the API. It validates that the query
 * parameters are correctly processed and the endpoint responds appropriately.
 *
 * Workflow:
 *
 * 1. Member joins and authenticates
 * 2. Member creates an article
 * 3. Test pagination with various sort parameters
 * 4. Validate sort_by and sort_order parameter handling
 * 5. Validate pagination metadata accuracy
 * 6. Validate filtering capabilities
 * 7. If data exists, verify actual sort order correctness
 *
 * Validation points:
 *
 * - Verify sort_by parameter is accepted and processed
 * - Verify sort_order parameter is accepted and processed
 * - Verify page parameter correctly returns requested page
 * - Verify limit parameter controls items per page
 * - Verify pagination metadata accuracy
 * - If data exists, validate actual sort order correctness
 * - Validate filtering parameters are processed correctly
 */
export async function test_api_article_images_sorting_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Member joins and authenticates
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates an article
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Test pagination with default sorting (no sort_by specified)
  const defaultPage =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(defaultPage);

  TestValidator.equals(
    "default pagination current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPage.pagination.limit,
    10,
  );

  // Step 4: Test sorting by created_at ascending
  const sortedByDateAsc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByDateAsc);

  // If data exists, verify sort order correctness
  if (sortedByDateAsc.data.length > 1) {
    for (let i = 0; i < sortedByDateAsc.data.length - 1; i++) {
      const current = new Date(sortedByDateAsc.data[i].created_at).getTime();
      const next = new Date(sortedByDateAsc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "created_at ascending order is correct",
        current <= next,
      );
    }
  }

  // Step 5: Test sorting by created_at descending
  const sortedByDateDesc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByDateDesc);

  // If data exists, verify descending order
  if (sortedByDateDesc.data.length > 1) {
    for (let i = 0; i < sortedByDateDesc.data.length - 1; i++) {
      const current = new Date(sortedByDateDesc.data[i].created_at).getTime();
      const next = new Date(sortedByDateDesc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "created_at descending order is correct",
        current >= next,
      );
    }
  }

  // Step 6: Test sorting by file_size descending
  const sortedByFileSize =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "file_size",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByFileSize);

  // If data exists, verify file_size descending order
  if (sortedByFileSize.data.length > 1) {
    for (let i = 0; i < sortedByFileSize.data.length - 1; i++) {
      TestValidator.predicate(
        "file_size descending order is correct",
        sortedByFileSize.data[i].file_size >=
          sortedByFileSize.data[i + 1].file_size,
      );
    }
  }

  // Step 7: Test sorting by original_filename alphabetically
  const sortedByFilename =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "original_filename",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByFilename);

  // If data exists, verify alphabetical order
  if (sortedByFilename.data.length > 1) {
    for (let i = 0; i < sortedByFilename.data.length - 1; i++) {
      const currentFilename = `${sortedByFilename.data[i].name}.${sortedByFilename.data[i].extension}`;
      const nextFilename = `${sortedByFilename.data[i + 1].name}.${sortedByFilename.data[i + 1].extension}`;
      TestValidator.predicate(
        "filename alphabetical order is correct",
        currentFilename.localeCompare(nextFilename) <= 0,
      );
    }
  }

  // Step 8: Test sorting by width
  const sortedByWidth =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "width",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByWidth);

  // If data exists with width values, verify width descending order
  const widthData = sortedByWidth.data.filter(
    (img) => img.width !== null && img.width !== undefined,
  );
  if (widthData.length > 1) {
    for (let i = 0; i < widthData.length - 1; i++) {
      const currentWidth = typia.assert(widthData[i].width!);
      const nextWidth = typia.assert(widthData[i + 1].width!);
      TestValidator.predicate(
        "width descending order is correct",
        currentWidth >= nextWidth,
      );
    }
  }

  // Step 9: Test sorting by height
  const sortedByHeight =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "height",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByHeight);

  // If data exists with height values, verify height ascending order
  const heightData = sortedByHeight.data.filter(
    (img) => img.height !== null && img.height !== undefined,
  );
  if (heightData.length > 1) {
    for (let i = 0; i < heightData.length - 1; i++) {
      const currentHeight = typia.assert(heightData[i].height!);
      const nextHeight = typia.assert(heightData[i + 1].height!);
      TestValidator.predicate(
        "height ascending order is correct",
        currentHeight <= nextHeight,
      );
    }
  }

  // Step 10: Test pagination - second page with sort consistency
  const firstPageSorted =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 5,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(firstPageSorted);

  const secondPage = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 5,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current value",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit value",
    secondPage.pagination.limit,
    5,
  );

  // Verify sort consistency across pages
  if (firstPageSorted.data.length > 0 && secondPage.data.length > 0) {
    const lastFirstPage = new Date(
      firstPageSorted.data[firstPageSorted.data.length - 1].created_at,
    ).getTime();
    const firstSecondPage = new Date(secondPage.data[0].created_at).getTime();
    TestValidator.predicate(
      "sort order is consistent across pages",
      lastFirstPage <= firstSecondPage,
    );
  }

  // Step 11: Test filtering with search query
  const searchResult =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.alphabets(3),
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(searchResult);

  TestValidator.equals(
    "search result pagination current page",
    searchResult.pagination.current,
    1,
  );

  // Step 12: Test filtering by content_type
  const jpegImages = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        content_type: "image/jpeg",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(jpegImages);

  // Step 13: Test file size range filtering
  const sizeFilteredImages =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        min_file_size: 1000,
        max_file_size: 500000,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sizeFilteredImages);

  // Verify all returned images are within size range
  if (sizeFilteredImages.data.length > 0) {
    for (const img of sizeFilteredImages.data) {
      TestValidator.predicate(
        "image file size is within specified range",
        img.file_size >= 1000 && img.file_size <= 500000,
      );
    }
  }

  // Step 14: Test dimension filtering
  const dimensionFilteredImages =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 10,
        min_width: 100,
        max_width: 2000,
        min_height: 100,
        max_height: 2000,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(dimensionFilteredImages);

  // Verify all returned images are within dimension range
  if (dimensionFilteredImages.data.length > 0) {
    for (const img of dimensionFilteredImages.data) {
      if (img.width !== null && img.width !== undefined) {
        TestValidator.predicate(
          "image width is within specified range",
          img.width >= 100 && img.width <= 2000,
        );
      }
      if (img.height !== null && img.height !== undefined) {
        TestValidator.predicate(
          "image height is within specified range",
          img.height >= 100 && img.height <= 2000,
        );
      }
    }
  }

  // Step 15: Test pagination metadata consistency
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );

  // Verify pagination metadata calculation is correct
  const expectedPages =
    defaultPage.pagination.limit > 0
      ? Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit)
      : 0;
  TestValidator.equals(
    "pagination pages calculation is correct",
    defaultPage.pagination.pages,
    expectedPages,
  );
}
