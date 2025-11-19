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

/**
 * Test detailed attachment retrieval to verify all metadata fields are
 * correctly populated and returned, including audit trail information.
 *
 * This test validates comprehensive attachment metadata for security auditing,
 * file management, and user transparency. It ensures all metadata fields
 * including uploader identity, file type classification, format specification,
 * size tracking, filename preservation, storage path, and timestamp audit trail
 * are correctly returned when retrieving attachment details.
 *
 * Workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category prerequisite
 * 3. Create member account and authenticate
 * 4. Create article as member
 * 5. Switch to moderator and upload image attachment with specific metadata
 * 6. Retrieve attachment and validate all metadata fields
 *
 * Validates: Complete metadata including id (UUID), article reference, uploader
 * identity, type/format classification, size accuracy, filename preservation,
 * storage path, and full timestamp audit trail (created_at, updated_at,
 * deleted_at).
 */
export async function test_api_article_attachment_retrieval_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for attachment testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create article as member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
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

  // Step 5: Switch to moderator and upload attachment
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const attachmentSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
  >();
  const originalFilename = `test-image-${RandomGenerator.alphaNumeric(8)}.png`;
  const storagePath = `/storage/attachments/${typia.random<string & tags.Format<"uuid">>()}.png`;

  const uploadedAttachment =
    await api.functional.discussionBoard.moderator.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          type: "image",
          format: "png",
          size: attachmentSize,
          original_filename: originalFilename,
          storage_path: storagePath,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(uploadedAttachment);

  // Step 6: Retrieve attachment and validate all metadata fields
  const retrievedAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: article.id,
      attachmentId: uploadedAttachment.id,
    });
  typia.assert(retrievedAttachment);

  // Validate all metadata fields
  TestValidator.equals(
    "attachment ID matches uploaded attachment",
    retrievedAttachment.id,
    uploadedAttachment.id,
  );

  TestValidator.equals(
    "article reference matches parent article",
    retrievedAttachment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "uploader ID matches moderator for accountability",
    retrievedAttachment.discussion_board_member_id,
    moderator.id,
  );

  TestValidator.equals(
    "type correctly identifies as image",
    retrievedAttachment.type,
    "image",
  );

  TestValidator.equals(
    "format matches upload specification",
    retrievedAttachment.format,
    "png",
  );

  TestValidator.equals(
    "size accurately reflects bytes for quota management",
    retrievedAttachment.size,
    attachmentSize,
  );

  TestValidator.equals(
    "original filename preserved exactly as provided",
    retrievedAttachment.original_filename,
    originalFilename,
  );

  TestValidator.equals(
    "storage path enables file content retrieval",
    retrievedAttachment.storage_path,
    storagePath,
  );

  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedAttachment.created_at !== null &&
      retrievedAttachment.created_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at timestamp is present",
    retrievedAttachment.updated_at !== null &&
      retrievedAttachment.updated_at !== undefined,
  );

  TestValidator.predicate(
    "deleted_at is null for active attachment",
    retrievedAttachment.deleted_at === null ||
      retrievedAttachment.deleted_at === undefined,
  );
}
