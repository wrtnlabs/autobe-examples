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
 * Validates that a contributor cannot update articles owned by other
 * contributors.
 *
 * This test verifies authorization enforcement by:
 *
 * 1. Creating first contributor account (Contributor A)
 * 2. Contributor A creates an article
 * 3. Contributor A verifies they can update their own article
 * 4. Creating second contributor account (Contributor B)
 * 5. Attempting to update Contributor A's article with Contributor B's credentials
 * 6. Verifying that the API returns 403 Forbidden error
 * 7. Confirming the article remains unchanged
 */
export async function test_api_article_contributor_update_other_contributor_article_forbidden(
  connection: api.IConnection,
) {
  // Step 1: Create first contributor (article author)
  const contributor1Email = typia.random<string & tags.Format<"email">>();
  const contributor1 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributor1Email,
      username: RandomGenerator.alphabets(10),
      password: "SecurePass123!",
      href: "http://example.com",
      referrer: "http://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor1);
  TestValidator.predicate(
    "first contributor should be authenticated",
    contributor1.token.access !== undefined &&
      contributor1.account_status === "active",
  );

  // Step 2: Create article by first contributor
  const category = typia.random<IDiscussionBoardArticleCategory.ISummary>();
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const originalContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: originalTitle,
          content: originalContent,
          categoryId: category.id,
          href: "http://example.com",
          referrer: "http://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.predicate(
    "article should be created in draft status",
    article.status === "draft",
  );
  TestValidator.equals(
    "article author should be first contributor",
    article.author.id,
    contributor1.id,
  );

  // Step 3: Verify first contributor can update their own article
  const updatedByAuthor =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          title: "Updated by Author",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedByAuthor);
  TestValidator.equals(
    "article should be updated by author",
    updatedByAuthor.title,
    "Updated by Author",
  );

  // Step 4: Create second contributor
  const contributor2Email = typia.random<string & tags.Format<"email">>();
  const contributor2 = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributor2Email,
      username: RandomGenerator.alphabets(10),
      password: "SecurePass456!",
      href: "http://example.com",
      referrer: "http://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor2);
  TestValidator.predicate(
    "second contributor should be authenticated",
    contributor2.token.access !== undefined &&
      contributor2.account_status === "active",
  );

  // Step 5: Attempt to update first contributor's article with second contributor's token
  // This should fail with 403 Forbidden error
  await TestValidator.error(
    "second contributor should not be able to update first contributor's article",
    async () => {
      await api.functional.discussionBoard.contributor.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            title: "Unauthorized Update Title",
            content: "Unauthorized content modification",
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
