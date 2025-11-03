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

export async function test_api_attachment_retrieval_member_access(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate first member
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "SecurePass123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member1);
  TestValidator.predicate(
    "first member should be authorized",
    member1.token !== undefined,
  );

  // Step 2: First member creates an article with attachments
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 7,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article should be created by first member",
    article.author.email,
    member1Email,
  );

  // Step 3: First member uploads an attachment to the article
  const attachmentFilename = `document-${RandomGenerator.alphaNumeric(8)}.pdf`;
  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: attachmentFilename,
          file_type: "application/pdf",
          file_extension: "pdf",
          file_size: 5242880,
          attachable_type: "article",
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment should belong to the article",
    attachment.discussion_board_article_id,
    article.id,
  );

  // Step 4: Register and authenticate second member
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "AnotherSecure456",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member2);
  TestValidator.predicate(
    "second member should be authorized",
    member2.token !== undefined,
  );

  // Step 5: Second member retrieves the attachment from first member's article
  const retrievedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(connection, {
      articleId: article.id,
      attachmentId: attachment.id,
    });
  typia.assert(retrievedAttachment);

  // Step 6: Verify attachment metadata is correctly returned
  TestValidator.equals(
    "retrieved attachment ID should match",
    retrievedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "retrieved attachment filename should match",
    retrievedAttachment.filename,
    attachmentFilename,
  );
  TestValidator.equals(
    "retrieved attachment type should be PDF",
    retrievedAttachment.file_type,
    "application/pdf",
  );
  TestValidator.equals(
    "retrieved attachment extension should be pdf",
    retrievedAttachment.file_extension,
    "pdf",
  );
  TestValidator.equals(
    "retrieved attachment should belong to correct article",
    retrievedAttachment.discussion_board_article_id,
    article.id,
  );

  // Step 7: Verify non-author member can access the attachment
  TestValidator.predicate(
    "second member is not the article author",
    member2.id !== article.author.id,
  );
  TestValidator.predicate(
    "attachment security status is safe",
    retrievedAttachment.security_status === "safe",
  );
}
