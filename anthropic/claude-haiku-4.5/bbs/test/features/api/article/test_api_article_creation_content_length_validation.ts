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
 * Test that article content length is validated according to constraints
 * (50-50000 characters).
 *
 * This test validates enforcement of article content length constraints by
 * testing boundary conditions. Articles must have substantive content (minimum
 * 50 characters) while respecting reasonable upper limits (maximum 50000
 * characters) on article size.
 *
 * Test cases:
 *
 * 1. Contributor authenticates successfully
 * 2. Attempt to create article with content < 50 chars - should fail
 * 3. Create article with content = 50 chars (minimum) - should succeed
 * 4. Create article with content = 50000 chars (maximum) - should succeed
 * 5. Attempt to create article with content > 50000 chars - should fail
 */
export async function test_api_article_creation_content_length_validation(
  connection: api.IConnection,
) {
  // 1. Contributor authentication
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<50>
        >(),
        password: RandomGenerator.alphabets(10) + "Aa1@",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // 2. Test content too short (< 50 characters)
  const shortContent = RandomGenerator.alphabets(49);
  await TestValidator.error(
    "should reject article with content < 50 characters",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: shortContent,
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // 3. Test content at minimum boundary (exactly 50 characters)
  const minimumContent = RandomGenerator.alphabets(50);
  const articleMin: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: minimumContent,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleMin);
  TestValidator.equals(
    "minimum boundary content length matches",
    articleMin.content.length,
    50,
  );

  // 4. Test content at maximum boundary (exactly 50000 characters)
  const maximumContent = RandomGenerator.alphabets(50000);
  const articleMax: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: maximumContent,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleMax);
  TestValidator.equals(
    "maximum boundary content length matches",
    articleMax.content.length,
    50000,
  );

  // 5. Test content too long (> 50000 characters)
  const longContent = RandomGenerator.alphabets(50001);
  await TestValidator.error(
    "should reject article with content > 50000 characters",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: longContent,
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );
}
