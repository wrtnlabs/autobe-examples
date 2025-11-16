import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that any user can retrieve detailed metadata and download URI for a
 * specific attachment on an article, without requiring authentication.
 *
 * Steps:
 *
 * 1. Register a new user (join)
 * 2. Create a new discussion article as the user
 * 3. Upload an attachment to the article (simulate a file, provide file_name, uri,
 *    etc.)
 * 4. Access the attachment metadata endpoint as public (no authentication) and
 *    validate the response correctly reflects the file's metadata (file_name,
 *    uri, type, etc.)
 * 5. Access the endpoint with:
 *
 *    - An invalid attachment ID (should error/not found)
 *    - Mismatched article/attachment (attachment does not belong to article - should
 *         error/not found)
 *    - After deleting the article or attachment (not covered here, as no delete
 *         endpoint; scenario placeholder)
 * 6. Confirm endpoint is accessible without authentication.
 */
export async function test_api_article_attachment_metadata_access_by_public(
  connection: api.IConnection,
) {
  // [1] Register a user
  const registerUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardUser.ICreate;
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: registerUserBody });
  typia.assert(user);

  // [2] Create an article (with user authentication)
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 8, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // [3] Upload an attachment to the article
  const attachmentBody = {
    uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.pdf`,
    file_name: `TestFile_${RandomGenerator.alphaNumeric(6)}.pdf`,
    file_type: "application/pdf",
    file_size: 100000,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const uploaded: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      { articleId: article.id, body: attachmentBody },
    );
  typia.assert(uploaded);

  // [4] Access attachment metadata as public/guest
  const publicConn: api.IConnection = { ...connection, headers: {} };
  const byPublic: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.articles.attachments.at(publicConn, {
      articleId: article.id,
      attachmentId: uploaded.id,
    });
  typia.assert(byPublic);
  TestValidator.equals(
    "Attachment metadata by public matches original upload",
    byPublic,
    uploaded,
  );

  // [5-1] Invalid attachment ID
  await TestValidator.error("invalid attachment id returns error", async () => {
    await api.functional.discussionBoard.articles.attachments.at(publicConn, {
      articleId: article.id,
      attachmentId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // [5-2] Mismatched article/attachment (use valid attachment from another article)
  // Create a second article and attach another file
  const article2Body = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 8, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: article2Body,
    });
  typia.assert(article2);
  const anotherAttachmentBody = {
    uri: `https://cdn.example.com/files/${RandomGenerator.alphaNumeric(16)}.pdf`,
    file_name: `OtherFile_${RandomGenerator.alphaNumeric(6)}.pdf`,
    file_type: "application/pdf",
    file_size: 82731,
  } satisfies IDiscussionBoardArticleAttachment.ICreate;
  const uploaded2: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      { articleId: article2.id, body: anotherAttachmentBody },
    );
  typia.assert(uploaded2);
  // Now try accessing attachment2 with article1 id (should error)
  await TestValidator.error(
    "attachment belongs to another article should error",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(publicConn, {
        articleId: article.id,
        attachmentId: uploaded2.id,
      });
    },
  );

  // [5-3] (Scenario placeholder) Deletion cannot be checked, as there is no delete endpoint for article/attachment
  // If deletes existed:
  // - would call delete endpoint, then attempt access and verify error
}
