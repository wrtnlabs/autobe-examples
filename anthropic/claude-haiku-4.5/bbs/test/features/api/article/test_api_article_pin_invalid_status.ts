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

export async function test_api_article_pin_invalid_status(
  connection: api.IConnection,
) {
  // Create moderator account for pin operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Create contributor account for article creation
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Create a random category ID for articles (using UUID format)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Create multiple draft articles to test invalid status pinning
  const invalidStatusArticles: IDiscussionBoardArticle[] =
    await ArrayUtil.asyncRepeat(
      5,
      async () =>
        await api.functional.discussionBoard.contributor.articles.create(
          connection,
          {
            body: {
              title: RandomGenerator.paragraph({ sentences: 3 }),
              content: RandomGenerator.content({ paragraphs: 2 }),
              categoryId: categoryId,
              href: "http://localhost:3000",
              referrer: "http://localhost:3000",
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        ),
    );

  // Verify all created articles are in draft status
  invalidStatusArticles.forEach((article) => {
    typia.assert(article);
    TestValidator.equals("article status is draft", article.status, "draft");
  });

  // Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Test pinning each draft article should fail
  // This validates the business rule: only published articles can be pinned
  await ArrayUtil.asyncForEach(
    invalidStatusArticles,
    async (article, index) => {
      await TestValidator.error(
        `cannot pin article in draft status (article ${index + 1})`,
        async () => {
          await api.functional.discussionBoard.moderator.articles.pin(
            connection,
            {
              articleId: article.id,
            },
          );
        },
      );
    },
  );
}
