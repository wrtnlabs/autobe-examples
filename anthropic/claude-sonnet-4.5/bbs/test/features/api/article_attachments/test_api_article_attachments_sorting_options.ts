import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Test comprehensive attachment sorting capabilities for discussion board
 * articles.
 *
 * This test validates that attachments can be sorted by multiple fields
 * (created_at, size, filename) in both ascending and descending orders. It also
 * verifies that default sorting behavior is created_at descending (newest
 * first), and that sorting works correctly when combined with filters and
 * pagination.
 *
 * Test workflow:
 *
 * 1. Create moderator and category
 * 2. Create member and article
 * 3. Upload diverse attachments with varying characteristics
 * 4. Test sort_by='created_at' with sort_order='desc' (default - newest first)
 * 5. Test sort_by='created_at' with sort_order='asc' (oldest first)
 * 6. Test sort_by='size' with sort_order='desc' (largest first)
 * 7. Test sort_by='size' with sort_order='asc' (smallest first)
 * 8. Test sort_by='filename' with sort_order='asc' (alphabetical A-Z)
 * 9. Test sort_by='filename' with sort_order='desc' (reverse alphabetical Z-A)
 * 10. Verify default sorting when parameters are omitted
 * 11. Confirm sorting works with filters
 * 12. Validate pagination preserves sort order
 */
export async function test_api_article_attachments_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for attachment sorting tests",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 4. Create article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 5. Upload diverse attachments with varying characteristics
  const attachmentData = [
    { type: "image", format: "jpeg", size: 5000, filename: "alpha.jpeg" },
    { type: "image", format: "png", size: 15000, filename: "zulu.png" },
    { type: "file", format: "pdf", size: 50000, filename: "bravo.pdf" },
    { type: "file", format: "docx", size: 25000, filename: "yankee.docx" },
    { type: "image", format: "gif", size: 8000, filename: "charlie.gif" },
    { type: "file", format: "xlsx", size: 35000, filename: "xray.xlsx" },
    { type: "image", format: "webp", size: 12000, filename: "delta.webp" },
    { type: "file", format: "txt", size: 3000, filename: "whiskey.txt" },
  ];

  const attachments: IDiscussionBoardArticleAttachment[] = [];
  for (const data of attachmentData) {
    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: data.type,
            format: data.format,
            size: data.size,
            original_filename: data.filename,
            storage_path: `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);

    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 6. Test sort_by='created_at' with sort_order='desc' (newest first - default)
  const sortedByDateDesc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);

  // Verify descending order by created_at
  for (let i = 0; i < sortedByDateDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "created_at desc order maintained",
      new Date(sortedByDateDesc.data[i].created_at) >=
        new Date(sortedByDateDesc.data[i + 1].created_at),
    );
  }

  // 7. Test sort_by='created_at' with sort_order='asc' (oldest first)
  const sortedByDateAsc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);

  // Verify ascending order by created_at
  for (let i = 0; i < sortedByDateAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "created_at asc order maintained",
      new Date(sortedByDateAsc.data[i].created_at) <=
        new Date(sortedByDateAsc.data[i + 1].created_at),
    );
  }

  // 8. Test sort_by='size' with sort_order='desc' (largest first)
  const sortedBySizeDesc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "size",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedBySizeDesc);

  // Verify descending order by size
  for (let i = 0; i < sortedBySizeDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "size desc order maintained",
      sortedBySizeDesc.data[i].size >= sortedBySizeDesc.data[i + 1].size,
    );
  }

  // 9. Test sort_by='size' with sort_order='asc' (smallest first)
  const sortedBySizeAsc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "size",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedBySizeAsc);

  // Verify ascending order by size
  for (let i = 0; i < sortedBySizeAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "size asc order maintained",
      sortedBySizeAsc.data[i].size <= sortedBySizeAsc.data[i + 1].size,
    );
  }

  // 10. Test sort_by='filename' with sort_order='asc' (alphabetical A-Z)
  const sortedByFilenameAsc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "filename",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedByFilenameAsc);

  // Verify ascending alphabetical order
  for (let i = 0; i < sortedByFilenameAsc.data.length - 1; i++) {
    TestValidator.predicate(
      "filename asc alphabetical order maintained",
      sortedByFilenameAsc.data[i].original_filename.localeCompare(
        sortedByFilenameAsc.data[i + 1].original_filename,
      ) <= 0,
    );
  }

  // 11. Test sort_by='filename' with sort_order='desc' (reverse alphabetical Z-A)
  const sortedByFilenameDesc =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "filename",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedByFilenameDesc);

  // Verify descending alphabetical order
  for (let i = 0; i < sortedByFilenameDesc.data.length - 1; i++) {
    TestValidator.predicate(
      "filename desc reverse alphabetical order maintained",
      sortedByFilenameDesc.data[i].original_filename.localeCompare(
        sortedByFilenameDesc.data[i + 1].original_filename,
      ) >= 0,
    );
  }

  // 12. Verify default sorting (should be created_at desc when parameters omitted)
  const defaultSorted =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(defaultSorted);

  // Verify default is created_at descending
  for (let i = 0; i < defaultSorted.data.length - 1; i++) {
    TestValidator.predicate(
      "default sorting is created_at desc",
      new Date(defaultSorted.data[i].created_at) >=
        new Date(defaultSorted.data[i + 1].created_at),
    );
  }

  // 13. Test sorting with type filter (images only, sorted by size desc)
  const imagesOnlySorted =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          type: "image",
          sort_by: "size",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(imagesOnlySorted);

  // Verify all are images and sorted by size desc
  for (const attachment of imagesOnlySorted.data) {
    TestValidator.equals("filtered type is image", attachment.type, "image");
  }
  for (let i = 0; i < imagesOnlySorted.data.length - 1; i++) {
    TestValidator.predicate(
      "filtered images sorted by size desc",
      imagesOnlySorted.data[i].size >= imagesOnlySorted.data[i + 1].size,
    );
  }

  // 14. Test sorting with format filter (pdf files, sorted by filename asc)
  const pdfFilesSorted =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          format: "pdf",
          sort_by: "filename",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(pdfFilesSorted);

  // Verify format filter and sorting
  for (const attachment of pdfFilesSorted.data) {
    TestValidator.equals("filtered format is pdf", attachment.format, "pdf");
  }

  // 15. Test sorting with size range filter (sizes between 10000-40000, sorted by created_at asc)
  const sizeRangeSorted =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          min_size: 10000,
          max_size: 40000,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sizeRangeSorted);

  // Verify size range and sorting
  for (const attachment of sizeRangeSorted.data) {
    TestValidator.predicate(
      "attachment size within range",
      attachment.size >= 10000 && attachment.size <= 40000,
    );
  }
  for (let i = 0; i < sizeRangeSorted.data.length - 1; i++) {
    TestValidator.predicate(
      "filtered by size range sorted by created_at asc",
      new Date(sizeRangeSorted.data[i].created_at) <=
        new Date(sizeRangeSorted.data[i + 1].created_at),
    );
  }

  // 16. Test pagination preserves sort order
  const firstPage =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 3,
          sort_by: "size",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(firstPage);

  const secondPage =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 2,
          limit: 3,
          sort_by: "size",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(secondPage);

  // Verify last item of first page is larger than first item of second page
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.predicate(
      "pagination preserves sort order across pages",
      firstPage.data[firstPage.data.length - 1].size >= secondPage.data[0].size,
    );
  }
}
