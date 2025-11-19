import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validates that a discussion board user (author) can successfully delete their
 * own file/image attachment from an article.
 *
 * 1. Register as a new user
 * 2. Upload a valid file attachment to a hypothetical articleId (since no API for
 *    article creation is available, use random UUID)
 * 3. Delete the uploaded attachment with the DELETE endpoint
 * 4. Attempt to delete the same attachment again (should error)
 */
export async function test_api_user_attachment_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new user (author)
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password!1";
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Prepare a random articleId (since no API for article creation is available)
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Upload a valid attachment to this article
  const attachmentCreate = {
    file_name: `${RandomGenerator.alphaNumeric(8)}.png`,
    mime_type: "image/png",
    file_size: 512, // 512 bytes, valid
    file_uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(24)}.png`,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId,
        body: attachmentCreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment articleId matches",
    attachment.article_id,
    articleId,
  );
  TestValidator.equals(
    "attachment file_name matches",
    attachment.file_name,
    attachmentCreate.file_name,
  );
  TestValidator.equals(
    "attachment mime_type matches",
    attachment.mime_type,
    attachmentCreate.mime_type,
  );
  TestValidator.equals(
    "attachment file_size matches",
    attachment.file_size,
    attachmentCreate.file_size,
  );
  TestValidator.equals(
    "attachment file_uri matches",
    attachment.file_uri,
    attachmentCreate.file_uri,
  );

  // 4. Delete the uploaded attachment as author
  await api.functional.discussionBoard.user.articles.attachments.erase(
    connection,
    {
      articleId: attachment.article_id,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt to delete the same attachment again (should error)
  await TestValidator.error(
    "cannot delete already deleted attachment",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.erase(
        connection,
        {
          articleId: attachment.article_id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
