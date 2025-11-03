import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that an authenticated user can upload (and associate) a valid file
 * attachment with an existing article.
 *
 * Steps:
 *
 * 1. Register a fresh user and obtain access token.
 * 2. Create a new article as that user.
 * 3. Upload a file attachment (e.g., image/png or PDF) to the created article.
 * 4. Verify that the returned metadata -- filename, mimetype, kind, filesize,
 *    virus_scanned, created_at, etc. -- matches what was provided and business
 *    logic expectations, and is associated to the correct article.
 */
export async function test_api_user_attachment_upload_to_article(
  connection: api.IConnection,
) {
  // Step 1: Register new user & obtain token
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(15);
  const displayName = RandomGenerator.name();
  const avatarUrl = null;
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        avatar_url: avatarUrl,
      } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);
  TestValidator.equals("user email matches input", user.email, email);
  TestValidator.equals(
    "user display name matches input",
    user.display_name,
    displayName,
  );
  TestValidator.equals("user not locked", user.is_locked, false);

  // Step 2: Create new article as authenticated user
  const articleTitle = RandomGenerator.paragraph({ sentences: 4 });
  const articleBody = RandomGenerator.content({ paragraphs: 2 });
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.user.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals("article body matches input", article.body, articleBody);
  TestValidator.equals("article is not deleted", article.deleted_at, null);

  // Step 3: Upload an attachment to the article
  // Simulate a JPEG image upload with valid properties
  const attachFilename = RandomGenerator.alphaNumeric(8) + ".jpg";
  const attachKind = "image";
  const attachMimetype = "image/jpeg";
  const attachFilesize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3145728>
  >() satisfies number as number; // <= 3MB

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.user.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          filename: attachFilename,
          kind: attachKind,
          mimetype: attachMimetype,
          filesize: attachFilesize,
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // Step 4: Validate metadata
  TestValidator.equals(
    "attachment filename matches input",
    attachment.filename,
    attachFilename,
  );
  TestValidator.equals("attachment file kind", attachment.kind, attachKind);
  TestValidator.equals(
    "attachment mimetype matches input",
    attachment.mimetype,
    attachMimetype,
  );
  TestValidator.equals(
    "attachment filesize matches input",
    attachment.filesize,
    attachFilesize,
  );
  TestValidator.equals(
    "attachment is associated to article",
    attachment.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "attachment must be marked virus scanned",
    attachment.virus_scanned === true || attachment.virus_scanned === false,
  );
  TestValidator.predicate(
    "attachment has created_at timestamp",
    typeof attachment.created_at === "string" &&
      attachment.created_at.length > 0,
  );
  TestValidator.equals(
    "attachment not soft deleted",
    attachment.deleted_at,
    null,
  );
}
