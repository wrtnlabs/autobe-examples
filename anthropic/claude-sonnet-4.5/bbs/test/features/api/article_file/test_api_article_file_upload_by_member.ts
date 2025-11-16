import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member uploading file attachment to discussion board article.
 *
 * Validates the two-phase file upload workflow where files are uploaded to
 * external storage first, then linked to articles via metadata. Tests proper
 * authentication, article creation, file metadata validation, and the complete
 * file attachment process.
 *
 * Workflow:
 *
 * 1. Create and authenticate member account
 * 2. Member creates article with title and body
 * 3. Member uploads file attachment with complete metadata
 * 4. Verify file attachment record contains all fields
 */
export async function test_api_article_file_upload_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberUsername = RandomGenerator.name(2);

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: "https://discussion-board.example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://discussion-board.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Upload file attachment with complete metadata
  const fileTypes = [
    {
      filename: "economic_report_2024.pdf",
      contentType: "application/pdf",
      size: 2457600,
    },
    {
      filename: "budget_analysis.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 1048576,
    },
    { filename: "market_data.csv", contentType: "text/csv", size: 524288 },
    {
      filename: "policy_document.txt",
      contentType: "text/plain",
      size: 102400,
    },
  ] as const;

  const selectedFile = RandomGenerator.pick(fileTypes);
  const storageUrl =
    `https://cdn.example.com/files/${typia.random<string & tags.Format<"uuid">>()}/${selectedFile.filename}` satisfies string &
      tags.Format<"uri">;

  const fileAttachment: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: selectedFile.filename,
          file_size: selectedFile.size,
          content_type: selectedFile.contentType,
          storage_url: storageUrl,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);

  // Step 4: Validate file attachment record - business logic validation only
  TestValidator.equals(
    "file attachment article ID matches",
    fileAttachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "file attachment filename matches",
    fileAttachment.original_filename,
    selectedFile.filename,
  );
  TestValidator.equals(
    "file attachment size matches",
    fileAttachment.file_size,
    selectedFile.size,
  );
  TestValidator.equals(
    "file attachment content type matches",
    fileAttachment.content_type,
    selectedFile.contentType,
  );
  TestValidator.equals(
    "file attachment storage URL matches",
    fileAttachment.storage_url,
    storageUrl,
  );
}
