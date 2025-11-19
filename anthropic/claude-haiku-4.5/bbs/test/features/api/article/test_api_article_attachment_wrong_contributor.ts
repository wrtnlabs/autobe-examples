import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test attachment by a different contributor than the article author.
 *
 * This test validates that the system properly enforces contributor-level
 * permissions when attaching files to articles. Specifically, it verifies that
 * only the article's original author can attach files to their article, and
 * that other contributors cannot modify articles they did not create.
 *
 * Test workflow:
 *
 * 1. Register Contributor A and create an article
 * 2. Register Contributor B (different contributor)
 * 3. Attempt to attach a file to Contributor A's article as Contributor B
 * 4. Verify that the attachment operation fails or that proper permissions are
 *    enforced
 * 5. Confirm that article ownership is respected in attachment operations
 */
export async function test_api_article_attachment_wrong_contributor(
  connection: api.IConnection,
) {
  // Step 1: Register first contributor (article author)
  const contributor1Email = typia.random<string & tags.Format<"email">>();
  const contributor1: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributor1Email,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor1);
  const contributor1Token = contributor1.token.access;

  // Step 2: Create a random category ID for the article
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create an article as Contributor 1
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "https://example.com/create-article",
          referrer: "https://example.com/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article author matches contributor 1",
    article.author.id,
    contributor1.id,
  );

  // Step 4: Register second contributor (different from article author)
  const contributor2Email = typia.random<string & tags.Format<"email">>();
  const contributor2: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributor2Email,
        username: RandomGenerator.alphabets(8),
        password: "SecurePass456!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor2);

  // Step 5: Attempt to attach a file as Contributor 2 (wrong contributor)
  // This should fail because Contributor 2 did not create the article
  await TestValidator.error(
    "contributor 2 cannot attach file to contributor 1 article",
    async () => {
      await api.functional.discussionBoard.contributor.articles.attachments.attach(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: RandomGenerator.alphabets(10) + ".pdf",
            file_type: "pdf",
            file_size: 1024 * 100,
            mime_type: "application/pdf",
            display_url: "https://example.com/files/document.pdf",
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        },
      );
    },
  );

  // Step 6: Restore Contributor 1's authentication and verify they can attach files to their own article
  connection.headers ??= {};
  connection.headers.Authorization = contributor1Token;

  const attachment: IDiscussionBoardArticleAttachment =
    await api.functional.discussionBoard.contributor.articles.attachments.attach(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: RandomGenerator.alphabets(10) + ".png",
          file_type: "png",
          file_size: 1024 * 50,
          mime_type: "image/png",
          display_url: "https://example.com/files/image.png",
        } satisfies IDiscussionBoardArticleAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment article id matches",
    attachment.discussion_board_article_id,
    article.id,
  );
}
