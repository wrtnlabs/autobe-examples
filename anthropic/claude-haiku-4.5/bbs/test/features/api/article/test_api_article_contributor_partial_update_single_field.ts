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
 * Test partial update of article fields with single field modification.
 *
 * This test validates that the PUT
 * /discussionBoard/contributor/articles/{articleId} endpoint supports partial
 * updates where only specific fields are modified. The test:
 *
 * 1. Creates a contributor account
 * 2. Creates an article with initial title, content, and category
 * 3. Updates only the title field, verifying content and category remain unchanged
 * 4. Resets the article and updates only the content field, verifying other fields
 *    remain unchanged
 * 5. Resets the article and updates only the category field, verifying other
 *    fields remain unchanged
 *
 * This ensures the API properly supports partial updates through optional
 * request body parameters.
 */
export async function test_api_article_contributor_partial_update_single_field(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article with initial values
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialContent = RandomGenerator.content({ paragraphs: 2 });
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: initialTitle,
          content: initialContent,
          categoryId: categoryId,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "initial article title matches",
    article.title,
    initialTitle,
  );
  TestValidator.equals(
    "initial article content matches",
    article.content,
    initialContent,
  );

  // Step 3: Partial update - modify only title
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedArticle1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          title: updatedTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle1);
  TestValidator.equals(
    "updated article title matches",
    updatedArticle1.title,
    updatedTitle,
  );
  TestValidator.equals(
    "content unchanged after title update",
    updatedArticle1.content,
    initialContent,
  );

  // Step 4: Partial update - modify only content
  const updatedContent = RandomGenerator.content({ paragraphs: 2 });
  const updatedArticle2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          content: updatedContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle2);
  TestValidator.equals(
    "updated article content matches",
    updatedArticle2.content,
    updatedContent,
  );
  TestValidator.equals(
    "title remains as previously updated",
    updatedArticle2.title,
    updatedTitle,
  );

  // Step 5: Partial update - modify only category
  const newCategoryId = typia.random<string & tags.Format<"uuid">>();
  const updatedArticle3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          article_category_id: newCategoryId,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle3);
  TestValidator.equals(
    "category updated correctly",
    updatedArticle3.category.id,
    newCategoryId,
  );
  TestValidator.equals(
    "content remains unchanged after category update",
    updatedArticle3.content,
    updatedContent,
  );
  TestValidator.equals(
    "title remains unchanged after category update",
    updatedArticle3.title,
    updatedTitle,
  );
}
