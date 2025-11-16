import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete workflow of a moderator deleting a file attachment from a
 * discussion board article.
 *
 * This scenario validates that moderators can successfully remove file
 * attachments that were uploaded by members to articles, demonstrating proper
 * authorization and content moderation capabilities.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate a member account
 * 2. Member creates an article with title and body content
 * 3. Member uploads a file attachment to the created article
 * 4. Create and authenticate a moderator account (switching user context)
 * 5. Moderator deletes the file attachment from the article
 * 6. Validate successful deletion operation
 */
export async function test_api_article_file_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_password_123";
  const memberUsername = RandomGenerator.name(2);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      ip: "127.0.0.1",
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates an article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Member uploads a file attachment to the article
  const fileName = `${RandomGenerator.name(1)}_document.pdf`;
  const fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const contentType = "application/pdf";
  const storageUrl =
    `https://storage.example.com/files/${typia.random<string & tags.Format<"uuid">>()}.pdf` satisfies string &
      tags.Format<"uri">;

  const fileAttachment =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: fileName,
          file_size: fileSize,
          content_type: contentType,
          storage_url: storageUrl,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);

  // Step 4: Create and authenticate moderator account (switching user context)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_password_456";
  const moderatorUsername = RandomGenerator.name(2);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/moderator" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Moderator deletes the file attachment from the article
  await api.functional.discussionBoard.moderator.articles.files.erase(
    connection,
    {
      articleId: article.id,
      fileId: fileAttachment.id,
    },
  );

  // Step 6: Validation - deletion operation completed successfully (void return means success)
  // The operation succeeded without throwing an error, confirming moderator can delete member-created files
}
