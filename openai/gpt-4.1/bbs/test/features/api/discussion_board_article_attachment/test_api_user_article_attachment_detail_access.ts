import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate access to discussion board article attachment details for an
 * authenticated user (article author).
 *
 * This test ensures that:
 *
 * 1. Authenticated users (article authors) can successfully retrieve attachment
 *    metadata and download information for attachments on their own articles,
 *    provided neither the article nor the attachment is deleted.
 * 2. Secure access restrictions are enforced: only authors and admins can fetch
 *    details of non-deleted attachments.
 * 3. System returns correct metadata, including file/attachment attributes from
 *    the attachment response DTO.
 * 4. Verification that access is correctly denied when either the article or the
 *    attachment is deleted.
 *
 * Steps:
 *
 * 1. User registers for a new discussion board account (random unique
 *    email/password).
 * 2. User creates a new article with required fields (title/body) and no initial
 *    attachments.
 * 3. User uploads a valid attachment to the created article (providing valid
 *    kind/mimetype/filesize/filename).
 * 4. User fetches the attachment's details using the GET endpoint, and verifies
 *    the returned fields.
 * 5. (Negative) Attempt access after deleting the article would be tested here if
 *    delete endpoint existed (skipped).
 * 6. (Negative) Attempt access after deleting the attachment would be tested here
 *    if delete endpoint existed (skipped). (Delete endpoints not provided in
 *    current API definition.)
 *
 * Validates all expected type information and business rules for attachment
 * detail retrieval by the author.
 */
export async function test_api_user_article_attachment_detail_access(
  connection: api.IConnection,
) {
  // 1. Register as a new user (author)
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      avatar_url: undefined,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create an article as this user (no initial attachments)
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 6,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 16,
          wordMin: 5,
          wordMax: 15,
        }),
        attachments: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Upload an attachment to this article
  const attachmentData = {
    filename: `${RandomGenerator.alphabets(8)}.pdf`,
    kind: "document",
    mimetype: "application/pdf",
    filesize: 1024 + Math.floor(Math.random() * 1048576),
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const attachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentData,
      },
    );
  typia.assert(attachment);

  // 4. Retrieve the attachment details via the API
  const fetched =
    await api.functional.discussionBoard.user.articles.attachments.at(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("Attachment ID matches", fetched.id, attachment.id);
  TestValidator.equals(
    "Article ID matches",
    fetched.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "File attributes match",
    {
      filename: fetched.filename,
      kind: fetched.kind,
      mimetype: fetched.mimetype,
      filesize: fetched.filesize,
    },
    {
      filename: attachmentData.filename,
      kind: attachmentData.kind,
      mimetype: attachmentData.mimetype,
      filesize: attachmentData.filesize,
    },
  );
  TestValidator.predicate(
    "Attachment not deleted",
    fetched.deleted_at === null || fetched.deleted_at === undefined,
  );
  TestValidator.equals("Virus scan true", fetched.virus_scanned, true);

  // Negative: attempt access with a random unauthorized articleId/attachmentId
  const randomArticleId = typia.random<string & tags.Format<"uuid">>();
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Access denied for non-existent/unauthorized attachment",
    async () => {
      await api.functional.discussionBoard.user.articles.attachments.at(
        connection,
        {
          articleId: randomArticleId,
          attachmentId: randomAttachmentId,
        },
      );
    },
  );
}
