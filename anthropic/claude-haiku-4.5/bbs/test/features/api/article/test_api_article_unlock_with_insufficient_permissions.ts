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
 * Test unlock operation attempted by a contributor with insufficient
 * permissions.
 *
 * This test validates that non-moderator contributors cannot unlock articles.
 * The test simulates a real-world scenario where:
 *
 * 1. A contributor creates a discussion board article
 * 2. The same contributor (non-moderator) attempts to unlock the article
 * 3. The system should reject the unlock attempt with 403 Forbidden
 *
 * This ensures that only moderators can control article lock status and
 * contributors cannot perform moderator-exclusive operations.
 */
export async function test_api_article_unlock_with_insufficient_permissions(
  connection: api.IConnection,
) {
  // Step 1: Register a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.name(1),
      password: "SecurePass123!",
      href: "http://localhost/join",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Step 2: Create an article as contributor
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost/articles/create",
          referrer: "http://localhost",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article is created in draft status",
    article.status,
    "draft",
  );

  // Step 3: Attempt to unlock article as contributor (should fail with 403)
  await TestValidator.error(
    "contributor cannot unlock article - should return 403 Forbidden",
    async () => {
      await api.functional.discussionBoard.moderator.articles.unlock(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
