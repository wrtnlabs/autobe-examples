import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_article_attachment_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member joins and authenticates
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "password123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Member creates a discussion board article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 3. Member creates attachments for the article
  // Test both 'image' and 'file' types

  // Image attachment
  const imageAttachmentBody = {
    type: "image",
    url: `https://example.com/images/${RandomGenerator.alphaNumeric(8)}.jpg`,
    filename: `${RandomGenerator.alphaNumeric(6)}.jpg`,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const imageAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        id: article.id,
        body: imageAttachmentBody,
      },
    );
  typia.assert(imageAttachment);
  TestValidator.equals(
    "attachment article ID should match article ID",
    imageAttachment.discussionBoardArticleId,
    article.id,
  );
  TestValidator.equals(
    "attachment type is image",
    imageAttachment.type,
    "image",
  );
  TestValidator.equals(
    "attachment filename matches",
    imageAttachment.fileName,
    imageAttachmentBody.filename,
  );
  TestValidator.equals(
    "attachment url matches",
    imageAttachment.url,
    imageAttachmentBody.url,
  );

  // File attachment
  const fileAttachmentBody = {
    type: "file",
    url: `https://example.com/files/${RandomGenerator.alphaNumeric(8)}.pdf`,
    filename: `${RandomGenerator.alphaNumeric(6)}.pdf`,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const fileAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        id: article.id,
        body: fileAttachmentBody,
      },
    );
  typia.assert(fileAttachment);
  TestValidator.equals(
    "attachment article ID should match article ID",
    fileAttachment.discussionBoardArticleId,
    article.id,
  );
  TestValidator.equals("attachment type is file", fileAttachment.type, "file");
  TestValidator.equals(
    "attachment filename matches",
    fileAttachment.fileName,
    fileAttachmentBody.filename,
  );
  TestValidator.equals(
    "attachment url matches",
    fileAttachment.url,
    fileAttachmentBody.url,
  );
}
