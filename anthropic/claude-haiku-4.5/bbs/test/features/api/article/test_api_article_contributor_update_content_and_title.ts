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
 * Test that a contributor can successfully update both the title and content of
 * their own draft article.
 *
 * The contributor creates a new article in draft status, then updates it with
 * revised title (between 5-200 characters) and content (between 50-50,000
 * characters). This test validates that the updated_at timestamp reflects the
 * modification time, and the response contains the updated article with all
 * changes applied correctly. It also verifies that the article remains in draft
 * status after the update.
 *
 * Process:
 *
 * 1. Register a new contributor account
 * 2. Create a new article in draft status with initial title and content
 * 3. Generate updated title and content within valid constraints
 * 4. Update the article with the new title and content
 * 5. Validate the response contains updated values
 * 6. Verify the article status remains as draft
 * 7. Confirm the updated_at timestamp is newer than created_at
 */
export async function test_api_article_contributor_update_content_and_title(
  connection: api.IConnection,
) {
  // Step 1: Register a new contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor should be active",
    contributor.account_status === "active",
  );

  // Step 2: Create a new article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const initialTitle = RandomGenerator.paragraph({ sentences: 3 });
  const initialContent = RandomGenerator.content({ paragraphs: 2 });

  const createdArticle: IDiscussionBoardArticle =
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
  typia.assert(createdArticle);
  TestValidator.equals(
    "created article status should be draft",
    createdArticle.status,
    "draft",
  );
  TestValidator.equals(
    "created article author should be current contributor",
    createdArticle.author.id,
    contributor.id,
  );

  // Step 3: Generate updated title and content within valid constraints
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedContent = RandomGenerator.content({ paragraphs: 3 });

  // Step 4: Update the article with the new title and content
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: createdArticle.id,
        body: {
          title: updatedTitle,
          content: updatedContent,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);

  // Step 5: Validate the response contains updated values
  TestValidator.equals(
    "updated article title should match input",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated article content should match input",
    updatedArticle.content,
    updatedContent,
  );

  // Step 6: Verify the article status remains as draft
  TestValidator.equals(
    "updated article status should remain draft",
    updatedArticle.status,
    "draft",
  );

  // Step 7: Confirm the updated_at timestamp is newer than created_at
  const createdAtTime = new Date(createdArticle.created_at).getTime();
  const updatedAtTime = new Date(updatedArticle.updated_at).getTime();
  TestValidator.predicate(
    "updated_at timestamp should be newer than created_at",
    updatedAtTime >= createdAtTime,
  );
}
