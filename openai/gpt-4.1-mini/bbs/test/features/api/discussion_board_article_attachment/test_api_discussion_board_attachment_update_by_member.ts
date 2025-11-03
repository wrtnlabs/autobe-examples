import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_discussion_board_attachment_update_by_member(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member by joining
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongPass123!",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new discussion board article
  const articleCreateBody = {
    title: RandomGenerator.name(3),
    content_markdown: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    discussion_board_attachments: undefined,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Create an initial attachment under the article
  const attachmentCreateBody = {
    filename: `${RandomGenerator.name(2)}.png`,
    file_type: "image/png",
    file_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.png`,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 4. Update the attachment metadata
  const attachmentUpdateBody = {
    filename: `${RandomGenerator.name(2)}_updated.jpg`,
    file_type: "image/jpeg",
    file_url: `https://example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: attachmentUpdateBody,
      },
    );
  typia.assert(updatedAttachment);

  // 5. Validate that the updated result matches the update body
  TestValidator.equals(
    "updated attachment filename matches",
    updatedAttachment.filename,
    attachmentUpdateBody.filename,
  );

  TestValidator.equals(
    "updated attachment file_type matches",
    updatedAttachment.file_type,
    attachmentUpdateBody.file_type,
  );

  TestValidator.equals(
    "updated attachment file_url matches",
    updatedAttachment.file_url,
    attachmentUpdateBody.file_url,
  );

  // 6. Validate that the updated attachment retains the same articleId and id
  TestValidator.equals(
    "updated attachment articleId remains same",
    updatedAttachment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "updated attachment id remains same",
    updatedAttachment.id,
    attachment.id,
  );
}
