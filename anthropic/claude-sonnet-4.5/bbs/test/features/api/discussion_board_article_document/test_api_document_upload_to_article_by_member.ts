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

/**
 * Test the complete workflow of a member uploading a document attachment to
 * their own article.
 *
 * This test validates that members can enhance their articles with supporting
 * documentation such as PDF research papers or Word documents. The workflow
 * ensures proper authentication, article ownership, and document metadata
 * tracking.
 *
 * Workflow:
 *
 * 1. Create and authenticate moderator account for category management
 * 2. Create a category as moderator (required for article creation)
 * 3. Create and authenticate member account
 * 4. Create an article as the authenticated member
 * 5. Upload a document file to the created article
 *
 * Validation:
 *
 * - Document upload succeeds with valid file format
 * - Document metadata is correctly recorded
 * - Uploader member ID matches the authenticated member
 * - Document is properly linked to the parent article
 * - Response includes complete document attachment information
 */
export async function test_api_document_upload_to_article_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a category as moderator
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

  // Step 3: Create and authenticate member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 4: Create an article as the authenticated member
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

  // Step 5: Upload a document to the created article
  const documentTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
  ] as const;

  const selectedMimeType = RandomGenerator.pick(documentTypes);
  const fileExtensions = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/msword": "doc",
    "text/plain": "txt",
    "application/rtf": "rtf",
    "application/vnd.oasis.opendocument.text": "odt",
  } as const;

  const extension = fileExtensions[selectedMimeType];
  const originalFilename = `${RandomGenerator.name(1)}_document.${extension}`;
  const fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
  >();

  const document =
    await api.functional.discussionBoard.member.articles.documents.create(
      connection,
      {
        articleId: article.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          original_name: originalFilename,
          mime_type: selectedMimeType,
          size_bytes: fileSize,
        } satisfies IDiscussionBoardArticleDocument.ICreate,
      },
    );
  typia.assert(document);

  // Validate document metadata
  TestValidator.equals(
    "document belongs to article",
    document.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "uploader is member",
    document.uploaded_by_member_id,
    member.id,
  );
  TestValidator.equals(
    "original filename preserved",
    document.original_name,
    originalFilename,
  );
  TestValidator.equals(
    "mime type recorded",
    document.mime_type,
    selectedMimeType,
  );
  TestValidator.equals("file size recorded", document.size_bytes, fileSize);
  TestValidator.predicate("document ID generated", document.id.length > 0);
  TestValidator.predicate(
    "stored name generated",
    document.stored_name.length > 0,
  );
  TestValidator.predicate(
    "created timestamp set",
    document.created_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", document.deleted_at, undefined);
}
