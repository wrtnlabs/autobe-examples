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
 * Test pagination and sorting capabilities for article image listings.
 *
 * This validates that users can efficiently navigate through articles with many
 * image attachments using different sorting criteria including upload date,
 * file size, and dimensions.
 *
 * Workflow:
 *
 * 1. Create member account for article and image operations
 * 2. Create moderator account for category creation
 * 3. Create category as moderator
 * 4. Re-authenticate as member
 * 5. Create article as member
 * 6. Upload 10 images with varied properties
 * 7. Test pagination with page size 5
 * 8. Test various sorting options
 * 9. Validate metadata and ordering
 */
export async function test_api_article_images_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12) + "A1!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12) + "A1!",
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

  // Step 4: Create article as member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 1 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload 10 images with varied properties
  const imageFormats = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ] as const;
  const uploadedImages: IDiscussionBoardArticleImage[] = [];

  for (let i = 0; i < 10; i++) {
    const width = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >();
    const height = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<8000>
    >();
    const sizeBytes = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
    >();
    const mimeType = RandomGenerator.pick(imageFormats);

    const image =
      await api.functional.discussionBoard.member.articles.images.create(
        connection,
        {
          articleId: article.id,
          body: {
            url: typia.random<string & tags.Format<"uri">>(),
            original_name: `image_${i}_${RandomGenerator.alphaNumeric(8)}.${mimeType.split("/")[1]}`,
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

  // Step 6: Test pagination - first page with page size 5
  const firstPage = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(firstPage);

  TestValidator.equals(
    "first page should have 5 items",
    firstPage.data.length,
    5,
  );
  TestValidator.equals(
    "total records should be 10",
    firstPage.pagination.records,
    10,
  );
  TestValidator.equals(
    "total pages should be 2",
    firstPage.pagination.pages,
    2,
  );
  TestValidator.equals(
    "current page should be 1",
    firstPage.pagination.current,
    1,
  );

  // Step 7: Retrieve second page to verify pagination continuity
  const secondPage = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page should have 5 items",
    secondPage.data.length,
    5,
  );
  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );

  // Verify no duplicate images between pages
  const firstPageIds = firstPage.data.map((img) => img.id);
  const secondPageIds = secondPage.data.map((img) => img.id);
  const hasNoDuplicates = firstPageIds.every(
    (id) => !secondPageIds.includes(id),
  );
  TestValidator.predicate(
    "pages should have no duplicate images",
    hasNoDuplicates,
  );

  // Step 8: Test sorting by upload date - newest first (descending)
  const sortedByDateDesc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByDateDesc);

  // Verify descending order by created_at
  for (let i = 0; i < sortedByDateDesc.data.length - 1; i++) {
    const current = new Date(sortedByDateDesc.data[i].created_at).getTime();
    const next = new Date(sortedByDateDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `image ${i} created_at should be >= image ${i + 1}`,
      current >= next,
    );
  }

  // Test sorting by upload date - oldest first (ascending)
  const sortedByDateAsc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByDateAsc);

  // Verify ascending order by created_at
  for (let i = 0; i < sortedByDateAsc.data.length - 1; i++) {
    const current = new Date(sortedByDateAsc.data[i].created_at).getTime();
    const next = new Date(sortedByDateAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `image ${i} created_at should be <= image ${i + 1} in ascending`,
      current <= next,
    );
  }

  // Step 9: Test sorting by file size - largest first (descending)
  const sortedBySizeDesc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "size_bytes",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedBySizeDesc);

  // Verify descending order by size_bytes
  for (let i = 0; i < sortedBySizeDesc.data.length - 1; i++) {
    TestValidator.predicate(
      `image ${i} size should be >= image ${i + 1}`,
      sortedBySizeDesc.data[i].size_bytes >=
        sortedBySizeDesc.data[i + 1].size_bytes,
    );
  }

  // Test sorting by file size - smallest first (ascending)
  const sortedBySizeAsc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "size_bytes",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedBySizeAsc);

  // Verify ascending order by size_bytes
  for (let i = 0; i < sortedBySizeAsc.data.length - 1; i++) {
    TestValidator.predicate(
      `image ${i} size should be <= image ${i + 1} in ascending`,
      sortedBySizeAsc.data[i].size_bytes <=
        sortedBySizeAsc.data[i + 1].size_bytes,
    );
  }

  // Step 10: Test sorting by width - descending
  const sortedByWidthDesc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "width",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByWidthDesc);

  // Verify descending order by width
  for (let i = 0; i < sortedByWidthDesc.data.length - 1; i++) {
    TestValidator.predicate(
      `image ${i} width should be >= image ${i + 1}`,
      sortedByWidthDesc.data[i].width >= sortedByWidthDesc.data[i + 1].width,
    );
  }

  // Test sorting by height - ascending
  const sortedByHeightAsc =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "height",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(sortedByHeightAsc);

  // Verify ascending order by height
  for (let i = 0; i < sortedByHeightAsc.data.length - 1; i++) {
    TestValidator.predicate(
      `image ${i} height should be <= image ${i + 1} in ascending`,
      sortedByHeightAsc.data[i].height <= sortedByHeightAsc.data[i + 1].height,
    );
  }

  // Step 11: Validate all 10 images are retrievable without pagination
  const allImages = await api.functional.discussionBoard.articles.images.index(
    connection,
    {
      articleId: article.id,
      body: {
        limit: 100,
      } satisfies IDiscussionBoardArticleImage.IRequest,
    },
  );
  typia.assert(allImages);

  TestValidator.equals(
    "all images count should be 10",
    allImages.data.length,
    10,
  );
  TestValidator.equals(
    "pagination records should be 10",
    allImages.pagination.records,
    10,
  );
}
