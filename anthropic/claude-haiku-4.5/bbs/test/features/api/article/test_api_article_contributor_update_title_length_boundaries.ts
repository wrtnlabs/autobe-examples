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
 * Test article title length boundary validation on update operations.
 *
 * This test validates that the article update endpoint properly enforces title
 * length constraints. Article titles must be between 5 and 200 characters.
 *
 * Test scenarios:
 *
 * 1. Create contributor account through registration
 * 2. Create article with valid initial content
 * 3. Test updating with exactly 5 characters (minimum boundary - valid)
 * 4. Test updating with exactly 200 characters (maximum boundary - valid)
 * 5. Test updating with 4 characters (below minimum - should fail)
 * 6. Test updating with 201 characters (above maximum - should fail)
 *
 * This ensures boundary conditions are properly validated and the API rejects
 * titles that violate the length constraints.
 */
export async function test_api_article_contributor_update_title_length_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "Abc123!@#",
        href: "http://localhost:3000/articles/create",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article with valid content
  const validTitle = "Initial Article Title for Testing Purposes";
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: validTitle,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 3: Test updating with exactly 5 characters (minimum boundary - valid)
  const minBoundaryTitle = "Valid";
  const minBoundaryUpdate: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          title: minBoundaryTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(minBoundaryUpdate);
  TestValidator.equals(
    "title updated to minimum boundary (5 chars)",
    minBoundaryUpdate.title,
    minBoundaryTitle,
  );

  // Step 4: Test updating with exactly 200 characters (maximum boundary - valid)
  const maxBoundaryTitle = RandomGenerator.alphabets(200);
  const maxBoundaryUpdate: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.update(
      connection,
      {
        articleId: article.id,
        body: {
          title: maxBoundaryTitle,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(maxBoundaryUpdate);
  TestValidator.equals(
    "title updated to maximum boundary (200 chars)",
    maxBoundaryUpdate.title.length,
    200,
  );

  // Step 5: Test updating with 4 characters (below minimum - should fail)
  const belowMinTitle = RandomGenerator.alphabets(4);
  await TestValidator.error(
    "title with 4 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.contributor.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            title: belowMinTitle,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // Step 6: Test updating with 201 characters (above maximum - should fail)
  const aboveMaxTitle = RandomGenerator.alphabets(201);
  await TestValidator.error(
    "title with 201 characters should fail validation",
    async () => {
      await api.functional.discussionBoard.contributor.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            title: aboveMaxTitle,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );
}
