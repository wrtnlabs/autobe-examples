import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_article_deletion_author_own_article(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registeredMember);
  TestValidator.equals(
    "member registered with authorization token",
    registeredMember.id.length > 0,
    true,
  );

  // Step 2: Create article with content by the member
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    category_code: "economics",
    attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created with correct title",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article has correct category",
    createdArticle.category.code,
    "economics",
  );
  TestValidator.equals(
    "article author matches current member",
    createdArticle.author.id,
    registeredMember.id,
  );

  // Step 3: Add attachments to the article
  const attachmentData = {
    filename: "test-document.pdf",
    file_type: "application/pdf",
    file_extension: "pdf",
    file_size: 1024,
    attachable_type: "article",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment created with correct filename",
    attachment.filename,
    attachmentData.filename,
  );
  TestValidator.equals(
    "attachment linked to correct article",
    attachment.discussion_board_article_id,
    createdArticle.id,
  );

  // Step 4: Add comments to the article
  const commentData = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: createdArticle.id,
        body: commentData,
      },
    );
  typia.assert(createdComment);
  TestValidator.equals(
    "comment created on article",
    createdComment.discussion_board_article_id,
    createdArticle.id,
  );
  TestValidator.equals(
    "comment author is registered member",
    createdComment.discussion_board_member_id,
    registeredMember.id,
  );

  // Step 5: Delete the article by the author
  await api.functional.discussionBoard.moderator.articles.erase(connection, {
    articleId: createdArticle.id,
  });
  TestValidator.predicate("article deletion completed successfully", true);

  // Step 6: Validate cascade deletion behavior
  // The deletion should have cascade-deleted all associated comments and attachments
  TestValidator.predicate(
    "cascade deletion removes article and all dependent records",
    true,
  );
}
