import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

export async function test_api_discussion_board_article_attachment_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "1234",
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a discussion board article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    content_markdown: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 6,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);

  // 3. Create an attachment for the article
  const attachmentCreateBody = {
    filename:
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 5,
        wordMax: 10,
      }).replace(/\s+/g, "_") + ".png",
    file_type: "image/png",
    file_url: `https://example.com/files/${RandomGenerator.alphaNumeric(12)}.png`,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.discussionBoardArticles.discussionBoardAttachments.create(
      connection,
      { articleId: article.id, body: attachmentCreateBody },
    );
  typia.assert(attachment);

  // 4. Update the attachment metadata
  // We modify filename and file_url both (file_type optional)
  const updateBody = {
    filename: attachment.filename.replace(/\.png$/, ".jpg"),
    file_type: "image/jpeg",
    file_url: `https://example.com/files/${RandomGenerator.alphaNumeric(12)}.jpg`,
  } satisfies IDiscussionBoardAttachment.IUpdate;

  const updatedAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.admin.discussionBoardArticles.discussionBoardAttachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);

  // 5. Validate that updated fields changed correctly
  TestValidator.equals(
    "filename is updated",
    updatedAttachment.filename,
    updateBody.filename!,
  );
  TestValidator.equals(
    "file_type is updated",
    updatedAttachment.file_type,
    updateBody.file_type!,
  );
  TestValidator.equals(
    "file_url is updated",
    updatedAttachment.file_url,
    updateBody.file_url!,
  );

  // 6. Validate that unchanged properties remain the same
  TestValidator.equals(
    "attachment id remains",
    updatedAttachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "article id remains",
    updatedAttachment.discussion_board_article_id,
    attachment.discussion_board_article_id,
  );

  // 7. Negative test: attempt to update attachment without admin authentication
  // We simulate unauthorized by using empty headers (new connection with empty headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot update attachment",
    async () => {
      await api.functional.discussionBoard.admin.discussionBoardArticles.discussionBoardAttachments.update(
        unauthConn,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: updateBody,
        },
      );
    },
  );
}
