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
 * Test public retrieval of article attachments with pagination and filtering.
 *
 * This comprehensive test validates that attachments in published articles are
 * accessible to all users including guests without authentication. It verifies
 * pagination, filtering, sorting, and complete metadata retrieval
 * capabilities.
 *
 * Workflow:
 *
 * 1. Create moderator account and category
 * 2. Create member account and published article
 * 3. Upload multiple attachments with varying characteristics
 * 4. Test public retrieval with various filters and pagination
 * 5. Validate sorting and metadata completeness
 */
export async function test_api_article_attachments_public_retrieval_paginated(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to manage categories
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Articles about economic topics and analysis",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to author article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create published article to hold attachments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Upload multiple attachments with varying types, formats, and sizes
  const imageFormats = ["jpeg", "png", "gif", "webp"] as const;
  const documentFormats = ["pdf", "docx", "txt", "csv"] as const;

  const uploadedAttachments: IDiscussionBoardArticleAttachment[] = [];

  // Upload 6 image attachments with different formats and sizes
  for (let i = 0; i < 6; i++) {
    const format = RandomGenerator.pick([...imageFormats]);
    const size = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
    >();

    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "image",
            format: format,
            size: size,
            original_filename: `${RandomGenerator.name(1)}_image_${i + 1}.${format}`,
            storage_path: `/storage/images/${typia.random<string & tags.Format<"uuid">>()}.${format}`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    uploadedAttachments.push(attachment);
  }

  // Upload 4 document attachments with different formats and sizes
  for (let i = 0; i < 4; i++) {
    const format = RandomGenerator.pick([...documentFormats]);
    const size = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<5000> & tags.Maximum<10000000>
    >();

    const attachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: {
            type: "file",
            format: format,
            size: size,
            original_filename: `${RandomGenerator.name(1)}_document_${i + 1}.${format}`,
            storage_path: `/storage/files/${typia.random<string & tags.Format<"uuid">>()}.${format}`,
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    uploadedAttachments.push(attachment);
  }

  // Step 6: Create unauthenticated connection for public access testing
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Test 1: Basic pagination without filters
  const basicPage =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(basicPage);
  TestValidator.equals(
    "basic pagination returns 5 items",
    basicPage.data.length,
    5,
  );
  TestValidator.equals(
    "total records matches uploaded count",
    basicPage.pagination.records,
    10,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    basicPage.pagination.pages,
    2,
  );

  // Test 2: Filter by type - images only
  const imagesOnly =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          type: "image",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(imagesOnly);
  TestValidator.equals(
    "image filter returns 6 images",
    imagesOnly.data.length,
    6,
  );
  TestValidator.predicate(
    "all returned items are images",
    imagesOnly.data.every((a) => a.type === "image"),
  );

  // Test 3: Filter by type - documents only
  const documentsOnly =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          type: "file",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(documentsOnly);
  TestValidator.equals(
    "file filter returns 4 documents",
    documentsOnly.data.length,
    4,
  );
  TestValidator.predicate(
    "all returned items are files",
    documentsOnly.data.every((a) => a.type === "file"),
  );

  // Test 4: Filter by specific format
  const pdfAttachment = uploadedAttachments.find((a) => a.format === "pdf");
  if (pdfAttachment) {
    const pdfOnly =
      await api.functional.discussionBoard.articles.attachments.index(
        unauthConnection,
        {
          articleId: article.id,
          body: {
            page: 1,
            limit: 10,
            format: "pdf",
          } satisfies IDiscussionBoardArticleAttachment.IRequest,
        },
      );
    typia.assert(pdfOnly);
    TestValidator.predicate(
      "PDF filter returns only PDF files",
      pdfOnly.data.every((a) => a.format === "pdf"),
    );
  }

  // Test 5: Filter by size range
  const sizeRangeResult =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          min_size: 10000,
          max_size: 1000000,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sizeRangeResult);
  TestValidator.predicate(
    "size filter returns items within range",
    sizeRangeResult.data.every((a) => a.size >= 10000 && a.size <= 1000000),
  );

  // Test 6: Filename search
  const searchTarget = uploadedAttachments[0];
  const searchTerm = searchTarget.original_filename.substring(0, 5);
  const searchResult =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          filename_search: searchTerm,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "filename search returns matching results",
    searchResult.data.some((a) => a.original_filename.includes(searchTerm)),
  );

  // Test 7: Sort by size ascending
  const sortedBySizeAsc =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "size",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedBySizeAsc);
  TestValidator.predicate(
    "size ascending sort is correct",
    sortedBySizeAsc.data.length < 2 ||
      sortedBySizeAsc.data.every(
        (item, idx) =>
          idx === 0 || sortedBySizeAsc.data[idx - 1].size <= item.size,
      ),
  );

  // Test 8: Sort by size descending
  const sortedBySizeDesc =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "size",
          sort_order: "desc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedBySizeDesc);
  TestValidator.predicate(
    "size descending sort is correct",
    sortedBySizeDesc.data.length < 2 ||
      sortedBySizeDesc.data.every(
        (item, idx) =>
          idx === 0 || sortedBySizeDesc.data[idx - 1].size >= item.size,
      ),
  );

  // Test 9: Sort by filename alphabetically
  const sortedByFilename =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "filename",
          sort_order: "asc",
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(sortedByFilename);
  TestValidator.predicate(
    "filename ascending sort is correct",
    sortedByFilename.data.length < 2 ||
      sortedByFilename.data.every(
        (item, idx) =>
          idx === 0 ||
          sortedByFilename.data[idx - 1].original_filename <=
            item.original_filename,
      ),
  );

  // Test 10: Default sort order (created_at descending)
  const defaultSort =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sort is created_at descending",
    defaultSort.data.length < 2 ||
      defaultSort.data.every(
        (item, idx) =>
          idx === 0 ||
          new Date(defaultSort.data[idx - 1].created_at).getTime() >=
            new Date(item.created_at).getTime(),
      ),
  );

  // Test 11: Pagination across multiple pages
  const page2 = await api.functional.discussionBoard.articles.attachments.index(
    unauthConnection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticleAttachment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "second page returns remaining items",
    page2.data.length,
    5,
  );
  TestValidator.equals("page 2 current page is 2", page2.pagination.current, 2);

  // Test 12: Date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600000);
  const dateRangeResult =
    await api.functional.discussionBoard.articles.attachments.index(
      unauthConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          uploaded_after: oneHourAgo.toISOString(),
        } satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date filter returns recent uploads",
    dateRangeResult.data.every(
      (a) => new Date(a.created_at).getTime() >= oneHourAgo.getTime(),
    ),
  );
}
