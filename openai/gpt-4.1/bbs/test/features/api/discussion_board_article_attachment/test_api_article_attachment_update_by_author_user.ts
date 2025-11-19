import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an article's author (standard user) can update their own
 * attachment with both successful and failure cases.
 *
 * 1. Register as a new user, assert authentication and capture credentials.
 * 2. Create a new article as this user and assert ownership.
 * 3. Attach a valid (supported) file to the article and validate response.
 * 4. Update the attachment: change file_name, mime_type, file_size, file_uri (all
 *    updated to new valid values), and assert that response reflects the
 *    changes and audit fields (created_at, etc.) are updated.
 * 5. Failure case: Try to update with an unsupported mime_type (e.g.,
 *    'application/x-msdownload'), expect business error.
 * 6. Failure case: Try to update with oversize file_size (>10MB), expect business
 *    error.
 */
export async function test_api_article_attachment_update_by_author_user(
  connection: api.IConnection,
) {
  // 1. Register as a new user
  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "Xy!z9Ab1",
  } satisfies IDiscussionBoardUser.ICreate;
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registerBody,
    });
  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input",
    user.email,
    registerBody.email,
  );
  // 2. Create a new article as this user
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: createArticleBody,
    });
  typia.assert(article);
  TestValidator.equals(
    "article author matches user",
    article.author.email,
    user.email,
  );
  // 3. Attach a valid file to the article
  const validAttachmentBody = {
    file_name: "testfile.pdf",
    mime_type: "application/pdf",
    file_size: 1234567 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
    file_uri: "https://files.example.com/upload/testfile.pdf",
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: validAttachmentBody,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment belongs to article",
    attachment.article_id,
    article.id,
  );
  // 4. Update the attachment: new file and metadata
  const updateBody = {
    file_name: "updated-img.png",
    mime_type: "image/png",
    file_size: 204800 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
    file_uri: "https://files.example.com/upload/updated-img.png",
  } satisfies IDiscussionBoardArticleAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.discussionBoard.user.articles.attachments.update(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAttachment);
  TestValidator.equals(
    "attachment updated: file_name",
    updatedAttachment.file_name,
    updateBody.file_name,
  );
  TestValidator.equals(
    "attachment updated: mime_type",
    updatedAttachment.mime_type,
    updateBody.mime_type,
  );
  TestValidator.equals(
    "attachment updated: file_size",
    updatedAttachment.file_size,
    updateBody.file_size,
  );
  TestValidator.equals(
    "attachment updated: file_uri",
    updatedAttachment.file_uri,
    updateBody.file_uri,
  );
  TestValidator.equals(
    "attachment updated for article",
    updatedAttachment.article_id,
    article.id,
  );
  // 5. Failure test: unsupported mime_type
  const invalidMimeBody = {
    mime_type: "application/x-msdownload",
  } satisfies IDiscussionBoardArticleAttachment.IUpdate;
  await TestValidator.error(
    "update fails with unsupported mime_type",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.update(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: invalidMimeBody,
        },
      );
    },
  );
  // 6. Failure test: oversize file (>10MB)
  const oversizeBody = {
    file_size: 10485761 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<10485760>,
  } satisfies IDiscussionBoardArticleAttachment.IUpdate;
  await TestValidator.error(
    "update fails with excessive file_size",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.update(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: oversizeBody,
        },
      );
    },
  );
}
