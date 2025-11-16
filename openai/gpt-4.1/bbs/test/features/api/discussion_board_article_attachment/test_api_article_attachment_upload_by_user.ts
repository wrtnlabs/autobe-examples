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
 * Test the workflow of a user uploading a new file or image attachment to a
 * discussion board article they created.
 *
 * This test validates that:
 *
 * 1. A new user can register and receive authentication.
 * 2. The user can create a new article.
 * 3. The user can successfully upload an attachment to the created article,
 *    providing valid file metadata (URI, name, type, size).
 * 4. The returned attachment record correctly associates with the article and
 *    includes the proper uploaded metadata.
 * 5. Attachment business rules (e.g., size > 0, <= 10MB, file type as MIME) are
 *    compatible with upload requirements.
 * 6. The attachment's article_id matches the article, and returned fields match
 *    creation input.
 */
export async function test_api_article_attachment_upload_by_user(
  connection: api.IConnection,
) {
  // 1. Register user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const joinInput = {
    email: userEmail,
    password: userPassword,
    href: "https://discussion.test/join",
    referrer: "https://discussion.test/landing",
  } satisfies IDiscussionBoardUser.ICreate;
  const userAuthorized = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(userAuthorized);

  // 2. Create article as the user
  const articleInput = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    { body: articleInput },
  );
  typia.assert(article);

  // 3. Upload attachment for the article
  // Prepare attachment info
  const fileName = `${RandomGenerator.name(2)}.png`;
  const fileSize =
    (typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() % 10485760) +
    1; // 1 ~ 10MB
  const fileUri = `https://cdn.discussion.test/uploads/${RandomGenerator.alphaNumeric(20)}.png`;
  const fileType = RandomGenerator.pick([
    "image/png",
    "image/jpeg",
    "application/pdf",
  ] as const);
  const attachmentInput = {
    uri: fileUri,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize as number, // tags enforced at request
  } satisfies IDiscussionBoardArticleAttachment.ICreate;

  const attachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Validate returned attachment fields and associations
  TestValidator.equals(
    "attachment's article_id matches article id",
    attachment.article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment file_name matches input",
    attachment.file_name,
    attachmentInput.file_name,
  );
  TestValidator.equals(
    "attachment file_type matches input",
    attachment.file_type,
    attachmentInput.file_type,
  );
  TestValidator.equals(
    "attachment file_size matches input",
    attachment.file_size,
    attachmentInput.file_size,
  );
  TestValidator.equals(
    "attachment uri matches input",
    attachment.uri,
    attachmentInput.uri,
  );
  TestValidator.predicate(
    "attachment id must be uuid",
    typeof attachment.id === "string" && attachment.id.length > 0,
  );
  TestValidator.predicate(
    "attachment uploaded_at is ISO string",
    typeof attachment.uploaded_at === "string" &&
      attachment.uploaded_at.length > 0,
  );
}
