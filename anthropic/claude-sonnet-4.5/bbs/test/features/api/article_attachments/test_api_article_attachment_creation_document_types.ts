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
 * Test successful creation of document attachments with all supported formats.
 *
 * This test validates that discussion board articles can accept document
 * attachments in all supported formats (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV)
 * with proper metadata. Each document attachment must have type='file',
 * accurate format field, size within 10MB limit, preserved original_filename,
 * and unique storage_path.
 *
 * Test workflow:
 *
 * 1. Create moderator account for category management
 * 2. Create article category for classification
 * 3. Create member account for article and attachment creation
 * 4. Create article to host document attachments
 * 5. Upload document attachments for each supported format
 * 6. Validate metadata correctness for each attachment
 */
export async function test_api_article_attachment_creation_document_types(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: "https://example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category
  const category: IDiscussionBoardArticleCategory =
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

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        ip: "127.0.0.1",
        href: "https://example.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create article to host attachments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Define supported document formats
  const documentFormats = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "txt",
    "csv",
  ] as const;

  // Step 6: Create document attachments for each format
  const attachments: IDiscussionBoardArticleAttachment[] = [];

  for (const format of documentFormats) {
    const fileSizeInBytes = typia.random<
      number &
        tags.Type<"int32"> &
        tags.Minimum<1000000> &
        tags.Maximum<9000000>
    >();

    const attachmentData = {
      type: "file",
      format: format,
      size: fileSizeInBytes,
      original_filename:
        `research_document_${RandomGenerator.alphaNumeric(6)}.${format}` satisfies string &
          tags.MaxLength<255>,
      storage_path: `/storage/attachments/${article.id}/${typia.random<string & tags.Format<"uuid">>()}.${format}`,
    } satisfies IDiscussionBoardArticleAttachment.ICreate;

    const attachment: IDiscussionBoardArticleAttachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: attachmentData,
        },
      );
    typia.assert(attachment);

    attachments.push(attachment);

    // Validate attachment metadata
    TestValidator.equals("attachment type is file", attachment.type, "file");
    TestValidator.equals(
      "attachment format matches",
      attachment.format,
      format,
    );
    TestValidator.equals(
      "attachment size matches",
      attachment.size,
      fileSizeInBytes,
    );
    TestValidator.predicate(
      "attachment size within 10MB limit",
      attachment.size <= 10485760,
    );
    TestValidator.equals(
      "original filename preserved",
      attachment.original_filename,
      attachmentData.original_filename,
    );
    TestValidator.predicate(
      "storage path is non-empty",
      attachment.storage_path.length > 0,
    );
    TestValidator.equals(
      "attachment associated with article",
      attachment.discussion_board_article_id,
      article.id,
    );
    TestValidator.equals(
      "attachment uploaded by member",
      attachment.discussion_board_member_id,
      member.id,
    );
  }

  // Step 7: Validate all formats were created
  TestValidator.equals(
    "all document formats created",
    attachments.length,
    documentFormats.length,
  );

  // Step 8: Verify unique storage paths
  const storagePaths = attachments.map((a) => a.storage_path);
  const uniquePaths = new Set(storagePaths);
  TestValidator.equals(
    "all storage paths are unique",
    uniquePaths.size,
    storagePaths.length,
  );
}
