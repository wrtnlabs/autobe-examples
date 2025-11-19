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

export async function test_api_article_lock_moderator_only_access(
  connection: api.IConnection,
) {
  // Step 1: Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: moderator.token.access },
  };

  // Step 2: Register contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      password: "SecurePass123!",
      username: RandomGenerator.alphabets(8),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  const contributorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: contributor.token.access },
  };

  // Step 3: Create article as contributor
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      contributorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          categoryId: categoryId,
          href: "http://localhost:3000",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);

  // Step 4: Test unauthenticated lock attempt (401 Unauthorized)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated lock should fail with 401",
    async () => {
      await api.functional.discussionBoard.moderator.articles.lock(
        unauthConnection,
        {
          articleId: article.id,
        },
      );
    },
  );

  // Step 5: Test contributor lock attempt (403 Forbidden)
  await TestValidator.error(
    "contributor lock should fail with 403 forbidden",
    async () => {
      await api.functional.discussionBoard.moderator.articles.lock(
        contributorConnection,
        {
          articleId: article.id,
        },
      );
    },
  );

  // Step 6: Test moderator lock attempt (should succeed)
  const lockedArticle =
    await api.functional.discussionBoard.moderator.articles.lock(
      moderatorConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(lockedArticle);
  TestValidator.equals(
    "article should be locked",
    lockedArticle.is_locked,
    true,
  );
  TestValidator.equals(
    "locked article id should match original article",
    lockedArticle.id,
    article.id,
  );
}
