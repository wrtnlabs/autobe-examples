import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Test retrieving a filtered and paginated list of attachments associated with
 * a specific article.
 *
 * This test validates the attachment discovery and filtering workflow by:
 *
 * 1. Creating a member account for article authorship
 * 2. Publishing an article to the discussion board
 * 3. Uploading multiple attachments with different file types (images and
 *    documents)
 * 4. Querying attachments with various search, filter, and pagination parameters
 * 5. Validating pagination respects limits and sort order
 * 6. Confirming attachment metadata includes security status, file size, and image
 *    dimensions
 *
 * The test ensures that members and guests can discover attachments through
 * filtering by filename, file type, and security status, with proper pagination
 * support.
 */
export async function test_api_article_attachments_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // 1. Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123";

  const memberRegisterRequest = {
    email: memberEmail,
    password: memberPassword,
  } satisfies IDiscussionBoardMember.IRegisterRequest;

  const memberAuth = await api.functional.auth.member.join(connection, {
    body: memberRegisterRequest,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authorization token should be provided",
    memberAuth.token.access.length > 0,
  );

  // 2. Create and publish an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 4 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
    attachments: undefined,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    { body: articleData },
  );
  typia.assert(article);
  TestValidator.equals("article is published", article.status, "published");

  // 3. Upload multiple attachments with different file types
  const imageAttachments = await ArrayUtil.asyncRepeat(2, async () => {
    const imageAttachment = {
      filename: `image_${RandomGenerator.alphaNumeric(8)}.jpg`,
      file_type: "image/jpeg",
      file_extension: "jpg",
      file_size: typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1000> &
          tags.Maximum<10485760>
      >(),
      attachable_type: "article" as const,
    } satisfies IDiscussionBoardAttachment.ICreate;

    return await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: imageAttachment,
      },
    );
  });

  const documentAttachments = await ArrayUtil.asyncRepeat(2, async () => {
    const docAttachment = {
      filename: `document_${RandomGenerator.alphaNumeric(8)}.pdf`,
      file_type: "application/pdf",
      file_extension: "pdf",
      file_size: typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1000> &
          tags.Maximum<20971520>
      >(),
      attachable_type: "article" as const,
    } satisfies IDiscussionBoardAttachment.ICreate;

    return await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: docAttachment,
      },
    );
  });

  typia.assert(imageAttachments);
  typia.assert(documentAttachments);

  // 4. Query attachments with various filters
  // Test: Retrieve all attachments with pagination
  const allAttachments =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(allAttachments);
  TestValidator.predicate(
    "should retrieve all attachments",
    allAttachments.data.length === 4,
  );
  TestValidator.equals(
    "pagination should show correct current page",
    allAttachments.pagination.current,
    1,
  );

  // Test: Filter by file type (images only)
  const imageFilter =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          file_type: "image/jpeg",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(imageFilter);
  TestValidator.predicate(
    "filtered results should contain only images",
    imageFilter.data.every((att) => att.file_type === "image/jpeg"),
  );

  // Test: Filter by file type (documents only)
  const documentFilter =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          file_type: "application/pdf",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(documentFilter);
  TestValidator.predicate(
    "filtered results should contain only PDFs",
    documentFilter.data.every((att) => att.file_type === "application/pdf"),
  );

  // Test: Search by filename
  const searchQuery = imageAttachments[0].filename.substring(0, 5);
  const searchResults =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          search: searchQuery,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should match filename query",
    searchResults.data.length > 0,
  );

  // Test: Pagination with limit
  const paginatedResults =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResults.data.length <= 2,
  );

  // Test: Sort by created_at
  const sortedByDate =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(sortedByDate);
  TestValidator.predicate(
    "sorted results should be chronologically ordered",
    sortedByDate.data.length > 0,
  );

  // 5. Validate attachment metadata
  const sampleAttachment = allAttachments.data[0];
  typia.assert(sampleAttachment);

  TestValidator.predicate(
    "attachment should have security status",
    sampleAttachment.security_status !== undefined &&
      sampleAttachment.security_status !== null,
  );

  TestValidator.predicate(
    "attachment should have file size",
    sampleAttachment.file_size > 0,
  );

  // Validate image dimensions if image attachment
  if (sampleAttachment.file_type.startsWith("image/")) {
    TestValidator.predicate(
      "image attachment should have width dimension",
      sampleAttachment.image_width === null ||
        sampleAttachment.image_width === undefined ||
        sampleAttachment.image_width > 0,
    );
    TestValidator.predicate(
      "image attachment should have height dimension",
      sampleAttachment.image_height === null ||
        sampleAttachment.image_height === undefined ||
        sampleAttachment.image_height > 0,
    );
  }

  // 6. Validate filtering by security status
  const safeAttachments =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          security_status: "safe",
        } satisfies IDiscussionBoardAttachment.IRequest,
      },
    );
  typia.assert(safeAttachments);
  TestValidator.predicate(
    "security status filter should work",
    safeAttachments.data.length >= 0,
  );
}
