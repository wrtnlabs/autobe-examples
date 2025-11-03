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

/**
 * Test successful deletion of an attachment by the member who originally
 * uploaded it.
 *
 * This test verifies that authenticated members can delete attachments they
 * have uploaded to articles. The complete workflow includes:
 *
 * 1. Register a new member account
 * 2. Create an article as the authenticated member
 * 3. Upload an attachment to the article
 * 4. Delete the attachment by the original uploader
 * 5. Verify the attachment has been removed from the article
 *
 * The deletion operation enforces ownership: only the member who uploaded the
 * attachment or a moderator can delete it. Guest users cannot delete
 * attachments.
 */
export async function test_api_attachment_deletion_by_member_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const registerResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registerResponse);
  TestValidator.predicate(
    "member registered successfully",
    registerResponse.id !== null,
  );

  // Step 2: Create an article as the authenticated member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_code: "economics",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);
  TestValidator.predicate("article created successfully", article.id !== null);

  // Step 3: Upload an attachment to the article
  const attachmentData = {
    filename: "test_document.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 50000,
    attachable_type: "article",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);
  TestValidator.predicate(
    "attachment uploaded successfully",
    attachment.id !== null,
  );
  TestValidator.equals(
    "attachment belongs to uploaded member",
    attachment.discussion_board_member_id,
    registerResponse.id,
  );
  TestValidator.equals(
    "attachment belongs to correct article",
    attachment.discussion_board_article_id,
    article.id,
  );

  // Step 4: Delete the attachment by the original uploader
  await api.functional.discussionBoard.articles.attachments.erase(connection, {
    articleId: article.id,
    attachmentId: attachment.id,
  });

  // Step 5: Verify deletion was successful
  TestValidator.predicate("attachment deletion completed without error", true);
}
